import xrequest from 'xrequest';

const requestIdInterceptor = xrequest.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  config.headers['X-Request-ID'] = generateRequestId();
  return config;
});

const authInterceptor = xrequest.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  config.headers['Authorization'] = `Bearer ${getAuthToken()}`;
  return config;
});

const responseLoggerInterceptor = xrequest.interceptors.response.use((response) => {
  console.log(`[${response.meta.engine}] ${response.meta.status} ${response.config.url}`);
  return response;
});

const errorHandlerInterceptor = xrequest.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.status === 401) {
      redirectToLogin();
    } else if (error.status === 403) {
      showForbiddenMessage();
    } else if (error.status >= 500) {
      showServerError();
    }
    return Promise.reject(error);
  }
);

xrequest.interceptors.request.eject(requestIdInterceptor);
xrequest.interceptors.request.eject(authInterceptor);
xrequest.interceptors.request.clear();

xrequest.interceptors.response.eject(responseLoggerInterceptor);
xrequest.interceptors.response.eject(errorHandlerInterceptor);
xrequest.interceptors.response.clear();

function generateRequestId(): string {
  return Math.random().toString(36).substring(2);
}

function getAuthToken(): string {
  return 'mock-token';
}

function redirectToLogin(): void {
  console.log('Redirecting to login...');
}

function showForbiddenMessage(): void {
  console.log('Access forbidden');
}

function showServerError(): void {
  console.log('Server error occurred');
}

xrequest.get('/api/users').then((response) => {
  console.log('Success:', response.data);
});