// client.js

const { PeerRPCClient } = require('grenache-nodejs-http');
const Link = require('grenache-nodejs-link');

const link = new Link({
  grape: 'http://127.0.0.1:30001' // Replace with your Grape server address
});
link.start();

const peerClient = new PeerRPCClient(link, {});
peerClient.init();

function submitOrder(order) {
  peerClient.request('order_handler', { action: 'submit_order', order }, { timeout: 10000 }, (err, data) => {
    if (err) {
      console.error('Error submitting order:', err);
    } else {
      console.log(data);
    }
  });
}