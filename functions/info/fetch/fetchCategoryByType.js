const axios = require('axios');
const { apiHost } = require('../../../config');

module.exports =  function fetchDataByType(type) {
    return axios.get(`${apiHost}${type}`);
};