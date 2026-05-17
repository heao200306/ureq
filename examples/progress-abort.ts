import xrequest from 'xrequest';

const controller = new AbortController();

const mockFormData = { file: 'test.txt' };

xrequest({
  url: '/api/upload',
  method: 'POST',
  data: mockFormData,
  onUploadProgress: (event) => {
    console.log(`Uploaded: ${event.loaded}/${event.total} (${event.percentage}%)`);
  },
  onDownloadProgress: (event) => {
    console.log(`Downloaded: ${event.loaded}/${event.total} (${event.percentage}%)`);
  },
  signal: controller.signal,
}).then((response) => {
  console.log('Upload complete:', response.data);
}).catch((error) => {
  if (error.isAbort) {
    console.log('Request was aborted');
  } else {
    console.error('Upload failed:', error);
  }
});

setTimeout(() => {
  controller.abort();
}, 5000);

xrequest.get('/api/users', {
  onDownloadProgress: (event) => {
    console.log(`Download progress: ${event.percentage}%`);
  },
}).then((response) => {
  console.log('Users:', response.data);
});