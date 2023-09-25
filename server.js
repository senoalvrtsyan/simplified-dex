const { PeerRPCServer } = require('grenache-nodejs-http');
const Link = require('grenache-nodejs-link');
const OrderBookManager = require('./OrderBookManager');


class OrderService {
  constructor() {
    this.dhtLink = new Link({
      grape: 'http://127.0.0.1:30001',
    });
    this.dhtLink.start();

    this.peer = new PeerRPCServer(this.dhtLink, {
      timeout: 300000,
    });
    this.peer.init();

    this.setupRPCService();

    setInterval(() => {
      this.dhtLink.announce('order_handler', this.service.port, {});
    }, 1000);

    this.orderBookManager = new OrderBookManager();
  }

  async init() {
    // Here we should retrieve data from DHT and 
    // each worker should maintain it's instance of orderbook and
    // publish updates about order changes.
    this.orderBookManager.init(data); // 'data' here should be data from DHT itselfs
  }

  setupRPCService() {
    this.service = this.peer.transport('server');
    this.service.listen(1337);
    this.service.on('request', this.handleClientRequest.bind(this));
  }

  handleClientRequest(rid, key, payload, handler) {
    if (payload.action === 'submit_order') {
      const { order } = payload; // { order: { clientId, orderId, type, price, quantity } }

      this.matchAndExecuteOrders(order);
      // Save the order in the DHT
      this.dhtLink.put({v: JSON.stringify(order)}, (err, hash) => {
        if(err) {
          handler.reply(null, {msg: 'Error'});
        } else {
          this.broadcastOrderBook((e, r) => {
            if(e) {
              handler.reply(null, {msg: 'Error'});
            } else {
              handler.reply(null, { msg: 'Order submitted successfully' });
            }
          });
        }
      });
    } else if(payload.action === 'orderbook_update') {
      this.orderBookManager.orderBook = payload.orderBook;
      handler.reply(null, { msg: 'Orderbook updated successfully' });
    }
  }

  matchAndExecuteOrders(order) {
    const oppositeType = order.type === 'buy' ? 'sell' : 'buy';
    const oppositeOrders = this.orderBookManager.orderBook[oppositeType];
    const matchingOrders = [];

    for (let i = 0; i < oppositeOrders.length; i++) {
      const oppositeOrder = oppositeOrders[i];

      if (order.type === 'buy' && order.price >= oppositeOrder.price ||
          order.type === 'sell' && order.price <= oppositeOrder.price) {
        // Matched orders, execute trade
        this.executeTrade(order, oppositeOrder);
        matchingOrders.push(oppositeOrder);
        oppositeOrders.splice(i, 1);
        i--; // Adjust the index after removing an order
      }
    }

    matchingOrders.sort((a, b) => order.type === 'buy' ? a.price - b.price : b.price - a.price);


    // Add the remaining orders back to the order book
    const remaingingQuantity = order.quantity;
    let remainingOrder = {};
    const executingOrders = [];
   
    for(let i = 0; i < matchingOrders.length; ++i) {
      const o = matchingOrders[i];
      executingOrders.push(o.id);
      if(o.quantity > remaingingQuantity) {
        lastIndex = i;
        remainingOrder = {...o, quantity: o.quantity - remaingingQuantity};
        remaingingQuantity = 0;
        break;
      } else {
        remaingingQuantity = order.quantity - o.quantity;
        remainingOrder = {...order, quantity: remaingingQuantity};
      }
    }

    if(remaingingQuantity) {
      this.orderBookManager.orderBook[order.type].push(remainingOrder)
    } else {
      this.orderBookManager.orderBook[oppositeType].push(remainingOrder)
    }

    this.orderBookManager.orderBook[oppositeType].filter(item => !executingOrders.find(exItem => item.id === exItem.id));

    /// TODO: Update account balances as well.
  }

  broadcastOrderBook(cb) {
    // Broadcast the updated order book to all clients
    this.peer.request(`order_handler`, {action: 'orderbook_update', orderbook: this.orderBookManager.orderBook}, cb);
  }
}

async function start() {
  const orderService = new OrderService();
  await orderService.init();
  orderService.setupRPCService();
}


start();