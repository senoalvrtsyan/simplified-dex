class OrderBookManager {
  constructor() {
    this.orderBook = {
      buy: [],
      sell: [],
    };
  }

  init(orders) {
    orders.forEach(order => this.addOrder(order));
  } 

  addOrder(order) {
    this.orderBook[order.type].push(order);
  }
  
  remove(id) {
    this.orderBook = this.orderBook.filter(order => order.id !== orderId);
  }
}