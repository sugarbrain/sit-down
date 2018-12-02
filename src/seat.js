const mqtt = require('mqtt');
const Gpio = require('pigpio').Gpio;

console.log('Connected.');

class Seat {
  constructor() {
    this.distance = 0;
    this.available = true;
    this.firstTick = true;
    this.connection = {
      broker: mqtt.connect('mqtt://broker.hivemq.com'),
      topic: 'SITDOWN'
    };
    
    this.history = [];
  }

  logHistory(dist) {
    if (this.history.length > 5) {
      this.history.slice(1);
    }

    this.history.push(dist);
  }

  averageDist() {
    return this.history.reduce((x, y) => x + y) / this.history.length;
  }

  init() {
    const MICROSECDONDS_PER_CM = 1e6/34321;
    const trigger = new Gpio(23, { mode: Gpio.OUTPUT });
    const echo = new Gpio(24, { mode: Gpio.INPUT, alert: true });

    trigger.digitalWrite(0);

    const watchHCSR04 = () => {
      let startTick;

      echo.on('alert', (level, tick) => {
        if (level == 1) {
          startTick = tick;
        } else {
          const endTick = tick;
          const diff = (endTick >> 0) - (startTick >> 0); // Unsigned 32 bit arithmetic
          const dist = diff / 2 / MICROSECDONDS_PER_CM;

          console.log(dist);
          this.logHistory(dist);
          this.checkState(dist);
          this.firstTick = false;
        }
      });
    };

    watchHCSR04();

    // Trigger a distance measurement once per second
    setInterval(() => {
      trigger.trigger(10, 1); // Set trigger high for 10 microseconds
    }, 1000);

  }

  checkState() {
    if ((this.averageDistance() >= 20.0 && !this.available) || (this.averageDistance() < 20.0 && this.available)) {
      this.available = !this.available;

      seat.publish(topic, JSON.stringify({
        action: this.firstTick ? 'SEAT_REGISTER' : 'SEAT_UPDATE',
        available: this.available
      }));
    }
  }
}

let seat = new Seat();
seat.init();