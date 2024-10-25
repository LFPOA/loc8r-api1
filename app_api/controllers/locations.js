const mongoose = require('mongoose');
const Loc = mongoose.model('Location');

const locationsListByDistance = async (req, res) => {
  const lng = parseFloat(req.query.lng);
  const lat = parseFloat(req.query.lat);

  // lng, lat 값 검증
  if (isNaN(lng) || isNaN(lat)) {
    return res.status(400).json({ 
      message: "Valid 'lng' and 'lat' query parameters are required" 
    });
  }

  const near = {
    type: "Point",
    coordinates: [lng, lat]
  };

  const geoOptions = {
    distanceField: "distance.calculated",
    key: 'coords',
    spherical: true,
    maxDistance: 2000000000000
  };

  try {
    const results = await Loc.aggregate([
      { $geoNear: { near, ...geoOptions } }
    ]);

    // 빈 배열인 경우 응답 처리
    if (results.length === 0) {
      return res.status(200).json([]);
    }

    const locations = results.map(result => ({
      _id: result._id,
      name: result.name,
      address: result.address,
      rating: result.rating,
      facilities: result.facilities,
      distance: `${result.distance.calculated.toFixed()}`
    }));

    res.status(200).json(locations);
  } catch (err) {
    console.error('locationsListByDistance 오류:', err); // 로그 추가
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};


const locationsCreate = async (req, res) => {
  try {
    const location = await Loc.create({
      name: req.body.name,
      address: req.body.address,
      facilities: req.body.facilities.split(","),
      coords: {
        type: "Point",
        coordinates: [
          parseFloat(req.body.lng),
          parseFloat(req.body.lat)
        ]
      },
      openingTimes: [
        {
          days: req.body.days1,
          opening: req.body.opening1,
          closing: req.body.closing1,
          closed: req.body.closed1
        },
        {
          days: req.body.days2,
          opening: req.body.opening2,
          closing: req.body.closing2,
          closed: req.body.closed2
        }
      ]
    });
    return res
      .status(201)
      .json(location);

  } catch (err) {
    return res
      .status(400)
      .json(err);
  }
};

const locationsReadOne = async (req, res) => {
  try {
    const location = await Loc.findById(req.params.locationid).exec();
    if (!location) {
      return res
        .status(404)
        .json({ "message": "location not found" });
    }
    return res
      .status(200)
      .json(location);
  } catch (err) {
    return res
      .status(404)
      .json(err);
  }
};


const locationsUpdateOne = async (req, res) => {
  if (!req.params.locationid) {
    return res
      .status(404)
      .json({
        "message": "Not found, locationid is required"
      });
  }
  try {
    const location = await Loc.findById(req.params.locationid).select('-reviews -rating').exec();
    
    if (!location) {
      return res
        .status(404)
        .json({
          "message": "locationid not found"
        });
    }
    location.name = req.body.name;
    location.address = req.body.address;
    location.facilities = req.body.facilities.split(',');
    location.coords = [
      parseFloat(req.body.lng),
      parseFloat(req.body.lat)
    ];
    location.openingTimes = [{
      days: req.body.days1,
      opening: req.body.opening1,
      closing: req.body.closing1,
      closed: req.body.closed1,
    }, {
      days: req.body.days2,
      opening: req.body.opening2,
      closing: req.body.closing2,
      closed: req.body.closed2,
    }];
    const updatedLocation = await location.save();
    return res
      .status(200)
      .json(updatedLocation);
  } catch (err) {
    return res
      .status(400)
      .json(err);
  }
};

const locationsDeleteOne = async (req, res) => {
  const { locationid } = req.params;
  if (!locationid) {
    return res
      .status(404)
      .json({
        "message": "No Location"
      });
  }
  try {
    const location = await Loc.findByIdAndRemove(locationid).exec();
    if (!location) {
      return res
        .status(404)
        .json({
          "message": "locationid not found"
        });
    }
    return res
      .status(204)
      .json(null);
  } catch (err) {
    return res
      .status(404)
      .json(err);
  }
};

module.exports = {
  locationsListByDistance,
  locationsCreate,
  locationsReadOne,
  locationsUpdateOne,
  locationsDeleteOne
};
