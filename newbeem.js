'use strict';

let askMessage = 'bbf0fc5dbeb0b81ca1487621a6dfaa9cc4a7bf8da37e04dff934c645462ad83f';
let onMessage = 'bbf0fc5dbeb0b81ca1487621a6dfaa9c99d67bab7409fd2523ac1ca40234161bcd3f0dff662485179db8027ff48a36ba1b2bf9908de119aee2f9b66a5638a4ef74a3fdebf5fc7e80b130d89650bf9b70f9af9765037c3078c3dde07aae973abc';
let offMessage = 'bbf0fc5dbeb0b81ca1487621a6dfaa9c99d67bab7409fd2523ac1ca40234161bcd3f0dff662485179db8027ff48a36ba120b54b035e5b6d13d3fc784e8313937579b78b2928df42b71005c85ae9ff6d48ac28a604b84caec39c5daa7dded511e';
let openMessage = '3f8150b04bf6e4156ce749acd6bd4d3a4611e016eb29759f105c377a51ee9451';
let closeMessage = '3f8150b04bf6e4156ce749acd6bd4d3afeea555fab2828468e5e8ba6abb7b2ca';

const dgram = require('dgram');

let Service, Characteristic;

module.exports = (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory('homebridge-newbeem', 'NewBeemSmartPlug', NewbeemLightPlugin);
};

class NewbeemLightPlugin
{

  /* MARK: Contructor definition */
  constructor(log, config) {
    this.log = log;
    this.name = config.name;
    this.port = config.port || 5000;
    this.address = config.address;
    this.state = false;
    this.newCallbackToCall = false;

    const subtype = this.name; 
    this.light = new Service.Lightbulb(this.name, subtype);

    this.server = dgram.createSocket('udp4');
    
    this.server.on('error', (err) => {
      console.log(`udp server error:\n${err.stack}`);
      server.close();
    });

    // Callback to set light indicator (on or off) when message is received
    this.server.on('message', (msg, rinfo) => {
      console.log(`server received udp: ${msg.toString('hex')} from ${rinfo.address}`);

      if (msg.toString('hex') == onMessage && rinfo.address == this.address) {
          console.log('Received message: light is OPEN');
          this.state = true;
      } else if (msg.toString('hex') == offMessage && rinfo.address == this.address) {
          console.log('Received message: light is CLOSED');
          this.state = false;
      }
      if (this.callback && this.newCallbackToCall) {
        console.log('Calling back after message receive using callback');
        this.newCallbackToCall = false;
        this.callback();
      }
    });

    // Set Callback to open and close
    var that = this;
    this.light.getCharacteristic(Characteristic.On).on('set', function(value,callback){
        console.log('Beginning setting routine...')
        that.state = value;
        that.setState(value,callback);
    });
    this.light.getCharacteristic(Characteristic.On).on('get', function(callback){
        console.log('Beginning asking routine...');
        that.askState();
        that.callback = callback;
        that.newCallbackToCall = true;
        return that.state;
    });

    this.server.bind(this.port);
  }

  /* End Constructor definition */

  setState(value, callback) {
    if (value) {
            var message = new Buffer(openMessage,'hex');
            this.server.send(message,0,message.length,this.port,this.address, function(err, bytes) {
              console.log('UDP message sent: OPENING');
              callback();
            });
        } else {
            var message = new Buffer(closeMessage,'hex');
            this.server.send(message,0,message.length,this.port,this.address, function(err, bytes) {
              console.log('UDP message sent: CLOSING');
              callback();
            });
        }
  }

  askState() {
    var message = new Buffer(askMessage,'hex');
    this.server.send(message,0,message.length,this.port,this.address, function(err, bytes) {
      console.log('UDP message sent: ASKING');
    });
  }

  getServices() {
    return [this.light];
  }
}