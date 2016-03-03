import * as Rx from 'rx';
import {Connection, Channel, Options} from 'amqplib';
import {Message} from 'amqplib/properties';
import AssertQueueReply from './reply/AssertQueueReply';
import AssertExchangeReply from './reply/AssertExchangeReply';
import EmptyReply from './reply/EmptyReply';
import RxMessage from './RxMessage';

/**
 * AMQP Rx Channel
 */
class RxChannel {

  /**
   * Class constructor.
   *
   * @param channel
   */
  constructor(private channel: Channel) {
  }

  /**
   * Assert a queue into existence.
   *
   * This operation is idempotent given identical arguments; however, it will bork the channel if the queue already
   * exists but has different properties.
   *
   * @param queue
   * @param options
   * @returns Rx.Observable<AssertQueueReply>
   */
  public assertQueue(queue: string, options: Options.AssertQueue): Rx.Observable<AssertQueueReply> {
    return Rx.Observable.fromPromise(this.channel.assertQueue(queue, options))
      .map(reply => new AssertQueueReply(this, reply));
  }

  /**
   * Assert an exchange into existence.
   *
   * @param exchange
   * @param type
   * @param options
   * @returns {Rx.Observable<AssertExchangeReply>}
   */
  public assertExchange(exchange: string, type: string, options?: Options.AssertExchange):
    Rx.Observable<AssertExchangeReply> {

    return Rx.Observable.fromPromise(this.channel.assertExchange(exchange, type, options))
      .map(reply => new AssertExchangeReply(this, reply))
  };

  /**
   * Publish a single message to an exchange.
   *
   * @param exchange
   * @param routingKey
   * @param content
   * @param options
   * @returns boolean
   */
  public publish(exchange: string, routingKey: string, content: Buffer,
                 options?: Options.Publish): boolean {
    return this.channel.publish(exchange, routingKey, content, options);
  }

  /**
   * Assert a routing path from an exchange to a queue. The exchanged named by `source` will relay messages to the
   * `queue` name, according to the type of the exchange and the `pattern` given.
   *
   * @param queue
   * @param source
   * @param pattern
   * @param args
   * @returns Rx.Observable<EmptyReply>
   */
  public bindQueue(queue: string, source: string, pattern: string, args?: any): Rx.Observable<EmptyReply> {
    return Rx.Observable.just(this.channel.bindQueue(queue, source, pattern, args))
      .map(() => new EmptyReply(this))
  }

  /**
   * Send a single message with the content given as a buffer to the specific queue named, bypassing routing.
   *
   * @param queue
   * @param message
   * @param options
   * @returns boolean
   */
  public sendToQueue(queue: string, message: Buffer, options?: Options.Publish): boolean {
    return this.channel.sendToQueue(queue, message, options);
  };

  /**
   * Set up a consumer where each message will emit an observable of `RxMessage`
   *
   * @param queue
   * @param options
   * @returns {Rx.Observable<RxMessage>}
   */
  public consume(queue: string, options?: Options.Consume): Rx.Observable<RxMessage> {
    return <Rx.Observable<RxMessage>> Rx.Observable.create(observer => {
        this.channel.consume(queue, (msg: Message) => {
          observer.onNext(new RxMessage(msg, this));
        }, options);
      });
  }


  /**
   * Close a channel.
   *
   * @returns Rx.Observable<void>
   */
  public close(): Rx.Observable<void> {
    return Rx.Observable.fromPromise(this.channel.close())
  }

  /**
   * Set the prefetch count for this channel. The count given is the maximum number of messages sent over the channel
   * that can be awaiting acknowledgement; once there are count messages outstanding, the server will not send more
   * messages on this channel until one or more have been acknowledged. A falsey value for count indicates no such
   * limit.
   *
   * @param count
   * @param global
   * @returns {Rx.Observable<EmptyReply>}
   */
  public prefetch(count: number, global?: boolean): Rx.Observable<EmptyReply> {
    return Rx.Observable.fromPromise(this.channel.prefetch(count, global))
      .map(reply => new EmptyReply(this));
  }

  /**
   * Acknowledge the given message, or all messages up to and including the given message.
   *
   * @param message
   * @param allUpTo
   * @returns void
   */
  public ack(message: RxMessage, allUpTo?: boolean): void {
    return this.channel.ack(message, allUpTo);
  }
}

export default RxChannel;