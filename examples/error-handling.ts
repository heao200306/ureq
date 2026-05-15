import xrequest from 'xrequest';

const customApi = xrequest.create({
  validateStatus: (status) => status >= 200 && status < 400,
});

customApi.get('/api/data').then((response) => {
  console.log('Success:', response.data);
}).catch((error) => {
  if (error.isTimeout) {
    console.error('Request timeout');
  } else if (error.isNetworkError) {
    console.error('Network error');
  } else if (error.isAbort) {
    console.error('Request aborted');
  } else {
    console.error('HTTP error:', error.status, error.statusText);
  }
});

xrequest({
  url: '/api/data',
  method: 'GET',
  timeout: 3000,
  validateStatus: (status) => status < 500,
}).catch((error) => {
  console.log('Error code:', error.code);
  console.log('Error status:', error.status);
  console.log('Error message:', error.message);
  console.log('Config:', error.config);
});

xrequest.get('/api/unknown').catch((error) => {
  console.error('Failed request:', error.message);
  console.error('Engine:', error.config?.meta?.engine);
});