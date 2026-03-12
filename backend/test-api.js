const axios = require('axios');
axios.get('http://localhost:5001/api/summaries').then(res => console.log(res.status)).catch(err => console.error(err.message));
