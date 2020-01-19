import { Component } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import axios from 'axios';
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
  newSymbolForm = new FormGroup({
    symbol: new FormControl('')
  });

  username = null;
  symbols = [];
  symbolItemList = [];

  handleSubmit() {
    const username = this.userForm.value.username;

    if(!username) {
      return;
    }

    this.getUserData(username);
  }

  handleAddSymbolSubmit() {
    // const url = 'https://us-central1-month-mov-avg-notifier.cloudfunctions.net/addSymbol';
    const url = 'http://localhost:5001/month-mov-avg-notifier/us-central1/addSymbol';
    const symbol = this.newSymbolForm.value.symbol;

    if(!symbol) {
      alert('No symbol added');
      return;
    }

    axios.post(url, {
      username: this.username,
      symbol: symbol
    })
      .then((response) => {
        this.getUserData(this.username);
        debugger;
        this.newSymbolForm.reset();
      })
      .catch((error) => {
        debugger;
      });
  }

  getUserData(username) {
    const url = 'https://us-central1-month-mov-avg-notifier.cloudfunctions.net/userData';

    axios.post(url, {
      username
    })
      .then((response) => {
        const data = response.data;
        this.symbols = Object.keys(data.symbols);

        this.symbolItemList = this.symbols.map((sym) => {
          const s = data.symbols[sym];

          if(s) {
            return {
              symbol: sym,
              // currentPrice: s.currentPrice,
              // margin: s.margin,
              // average: s.average,

              ...s,
              action: this.determineAction(s.currentPrice, s.average),
              prices: s.prices.map((price) => {
                // debugger;
                return {
                  price: price.price,
                  datetime: moment(price.datetime).format('MMM DD YYYY'),
                };
              })
            }
          }
          else {
            debugger;
          }
        });

        this.symbolItemList = this.symbolItemList.sort((a, b) => {
          if(a.symbol > b.symbol) {
            return 1;
          }
          else if(a.symbol < b.symbol) {
            return -1;
          }

          return 0;
        });

        debugger;

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
