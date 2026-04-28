const axios = require('axios');

async function test() {
  try {
    const res = await axios.get('https://breathy-backend-a6p5.onrender.com/api/queue/find-patient-by-phone', {
      params: { phone: '1234567890' } // some phone
    });
    console.log(typeof res.data, Array.isArray(res.data));
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error(err.message);
  }
}
test();
