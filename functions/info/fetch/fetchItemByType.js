const axios = require('axios');
const { apiHost } = require('../../../config');

module.exports =  function fetchDataByType(category, type) {
    return axios.get(`${apiHost}${category}/${type}`);
};