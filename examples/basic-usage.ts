import xrequest from 'xrequest';

xrequest.get('/api/users').then((response) => {
  console.log(response.data);
});