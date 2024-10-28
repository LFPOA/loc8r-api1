var request = require('request');

const apiOptions = {
  server: 'http://localhost:3000'
};
if(process.env.NODE_ENV === 'production'){
  apiOptions.server  = 'https://yourapi.com';
}

const homelist = (req, res) => {
  const path = '/api/locations';
  const requestOptions = {
    url: `${apiOptions.server}${path}`,
    method: 'GET',
    json: true,
    qs: {
      lng: 126.964062,
      lat: 37.468769,
      maxDistance: 2000000,
    },
    followRedirect: false,  // 리다이렉트 방지
  };

  // 요청 시작 로그
  console.log('API 요청 시작:', requestOptions);

  request(requestOptions, (err, { statusCode, headers } = {}, body) => {
    // 요청 오류 로그
    if (err) {
      console.error('API 요청 오류:', err);
      return res.status(500).send('서버 오류');
    }

    // 응답 상태 코드 및 헤더 로그
    console.log('응답 상태 코드:', statusCode);
    console.log('응답 헤더:', headers);

    // 리다이렉트 발생 시 로그
    if (statusCode === 302 || statusCode === 301) {
      console.error('리다이렉트 발생:', headers.location);
      return res.status(400).send('잘못된 요청: 리다이렉트가 발생했습니다.');
    }

    // 응답 내용이 예상과 다를 때 로그
    if (statusCode === 200) {
      console.log('응답 본문:', body);
    }

    // 응답이 배열인지 확인하고 처리
    let data = [];
    if (Array.isArray(body)) {
      data = body.map((item) => {
        item.distance = formatDistance(item.distance);
        return item;
      });
    } else {
      console.error('예상치 못한 응답 형식:', body);
      return res.status(500).send('API 응답 오류');
    }

    // 최종 데이터 로그 및 페이지 렌더링
    console.log('렌더링할 데이터:', data);
    renderHomepage(req, res, data);
  });
};


const renderHomepage = (req, res, responseBody) => {
  let message = null;
  if(!(responseBody instanceof Array)) {
      message = "API lookup error";
      responseBody = [];
  } else{
      if(!responseBody.length){
          message = "No places found nearby";
      }
  }

  res.render('locations-list', {
    title: 'Loc8r - find a place to work with wifi',
    pageHeader: {
      title: 'Loc8r',
      strapLine: 'Find places to work with wifi near you!'
    },
    sidebar: "Looking for wifi and a seat? Loc8r helps you find places to work when out and about. Perhaps with coffee, cake or a pint? Let Loc8r help you find the place you're looking for.",
    locations: responseBody,
    message
  });
};
      
const formatDistance = (distance) => {
  let thisDistance = 0;
  let unit = 'm';
  if(distance >1000){
      thisDistance = parseFloat(distance/1000).toFixed(1);
      unit = 'km';
  }else{
      thisDistance = Math.floor(distance);
  }
  return thisDistance+unit;
};

const renderDetailPage = (req, res, location) =>{
  res.render('location-info',{
      title: location.name,
      pageHeader:{
          title:location.name
      },
      sidebar: {
          context: 'is on Loc8r because it has accessible wifi and\
          space to sit down with your laptop and get some work done.',
          callToAction: "If you've been and you like it - or if you\
          don't - please leave a review to help toher people just like you"
      },
      location
  });
}

const getLocationInfo = (req, res, callbaack) => {
  const path = `/api/locations/${req.params.locationid}`;
  const requestOptions ={
      url:`${apiOptions.server}${path}`,
      method:'GET',
      json:{},
  };
  request(
    requestOptions,(err, {statusCode}, body) => {
    let data = body;
    if(statusCode === 200){
        data.coords={
            lng: body.coords[0],
            lat: body.coords[1]
        };
        callbaack(req, res, data);
    } else{
        showError(req,res,statusCode);
    }  
  }
);
};

const locationInfo =(req,res) =>{
  getLocationInfo(req, res,
    (req, res, reponseData) => renderDetailPage(req, res, reponseData)
  );
};

const renderReviewForm = function (req, res, {name}) {
  res.render('location-review-form', {
    title: `Review ${name} on Loc8r`,
    pageHeader: { title: `Review ${name}` },
    error: req.query.err
  });
};

const addReview = (req, res) => {
  getLocationInfo(req, res,
    (req, res, responseData) => renderReviewForm(req, res, responseData)
  );
};

const showError = (req, res, status) => {
  let title = '';
  let content = '';
  if(status === 404){
      title = '404, page note found';
      content = 'Oh dear. Looks like you can\'t find this page. Sorry.'; 
  } else{
      title = `${status}, something's gone wrong`;
      contetn = 'Something, somewhere, hase gone just a little bit wrong.';
  }
  res.status(status);
  res.render('generic-text',{
      title,
      content
  });
};

const doAddReview = (req, res) => {
  const locationid = req.params.locationid;
  const path = `/api/locations/${locationid}/reviews`;
  const postdata = {
    author: req.body.name,
    rating: parseInt(req.body.rating, 10),
    reviewText: req.body.review
  };
  const requestOptions = {
    url: `${apiOptions.server}${path}`,
    method: 'POST',
    json: postdata
  };
  if (!postdata.author || !postdata.rating || !postdata.reviewText) {
    res.redirect(`/location/${locationid}/review/new?err=val`);
  }
  else {
    request(
      requestOptions,
      (err, {statusCode}, {name}) => {
        if(statusCode === 201) {
          res.redirect(`/location/${locationid}`);
        } else if (statusCode === 400 && name && name === 'ValidationError') {
          res.redirect(`/location/${locationid}/review/new?err=val`);
        } else {
          showError(req, res, statusCode);
        }
      }
    );
  }
};


module.exports = {
  homelist,
  locationInfo,
  addReview,
  doAddReview
};
