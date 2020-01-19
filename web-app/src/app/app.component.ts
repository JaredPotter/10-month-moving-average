import { Component } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import axios from 'axios';
// import { Moment } from 'moment';
import * as moment from 'moment'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  userForm = new FormGroup({
    username: new FormControl('jared')
  });

  username = null;
  symbols = [];
  symbolItemList = [];
  lastUpdated = null;

  handleSubmit() {
    const username = this.userForm.value.username;

    if(!username) {
      return;
    }

    this.getUserData(username);
  }

  getUserData(username) {
    const url = 'https://us-central1-month-mov-avg-notifier.cloudfunctions.net/userData';

    axios.post(url, {
      username
    })
      .then((response) => {
        const data = response.data;
        this.lastUpdated = data.datetime;
        this.symbols = Object.keys(data.symbols);

        this.symbolItemList = this.symbols.map((sym) => {
          return {
            symbol: sym,
            // currentPrice: data.symbols[sym].currentPrice,
            // margin: data.symbols[sym].margin,
            // average: data.symbols[sym].average,

            ...data.symbols[sym],
            action: this.determineAction(data.symbols[sym].currentPrice, data.symbols[sym].average),
            prices: data.symbols[sym].prices.map((price) => {
              // debugger;
              return {
                price: price.price,
                datetime: moment(price.datetime).format('MMM DD YYYY'),
              };
            })
          }
        });

        this.username = data.username;
      })
      .catch((error) => {
        alert(error);
      });
  }

  handleLogout() {
    this.symbolItemList = [];
  }

  determineAction(currentPrice: number, averagePrice: number) {
    if(currentPrice >= averagePrice) {
      return '[BUY]';
    }
    else {
      return '[SELL]';
    }
  }

  handleUpdate() {
    axios.post('https://us-central1-month-mov-avg-notifier.cloudfunctions.net/calculateForUser', {
      username: this.username
    })
      .then((response) => {
        this.getUserData(this.username);

        alert('Update Complete!');
      })
      .catch((error) => {
        debugger;
      });
  }
}
