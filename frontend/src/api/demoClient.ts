import axios from 'axios';

// The demo endpoints use HttpOnly cookies, so we explicitly set withCredentials to true.
// No JWTs in Authorization headers are needed or used for demo endpoints.

const demoClient = axios.create({
  baseURL: '/api/v2/demo',
  withCredentials: true,
});

export default demoClient;
