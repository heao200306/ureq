import xrequest from 'xrequest';

const chainApi = xrequest.create({
  engine: ['fetch', 'xhr'],
  baseURL: 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

chainApi.get('/users').then((response) => {
  console.log('Success:', response.data);
  console.log('Engine used:', response.meta.engine);
});

chainApi.post('/users', { name: 'John' }).then((response) => {
  console.log('Created:', response.data);
});

const fetchOnlyApi = xrequest.create({
  engine: 'fetch',
  baseURL: 'https://api.example.com',
});

fetchOnlyApi.get('/users').then((response) => {
  console.log('Fetch only - Engine:', response.meta.engine);
});

const xhrOnlyApi = xrequest.create({
  engine: 'xhr',
  baseURL: 'https://api.example.com',
});

xhrOnlyApi.get('/users').then((response) => {
  console.log('XHR only - Engine:', response.meta.engine);
});

console.log('Engine chain:', chainApi.getEngine());
console.log('Config:', chainApi.getConfig());