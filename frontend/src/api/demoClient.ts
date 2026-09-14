import axios from 'axios';

// The demo endpoints use HttpOnly cookies, so we explicitly set withCredentials to true.
// No JWTs in Authorization headers are needed or used for demo endpoints.

const pythonApiUrl = import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000';

const demoClient = axios.create({
  baseURL: `${pythonApiUrl}/api/v2/demo`,
  withCredentials: true,
});

export default demoClient;
