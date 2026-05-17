import xrequest from 'xrequest';

const api = xrequest.create({
  engine: ['fetch', 'xhr'],
  baseURL: 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

api.get('/users').then((response) => {
  console.log(response.data);
});

api.post('/users', { name: 'John' }).then((response) => {
  console.log(response.data);
});

xrequest.setEngine(['fetch', 'xhr']);
console.log('Current engine:', xrequest.getEngine());

xrequest.setEngine('fetch');
console.log('Single engine:', xrequest.getEngine());

xrequest.setEngine(['xhr', 'fetch']);
console.log('Reversed engine chain:', xrequest.getEngine());