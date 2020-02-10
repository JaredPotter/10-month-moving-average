import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import * as moment from 'moment';
import axios from 'axios';

@Component({
  selector: 'app-what-if-calculator',
  templateUrl: './what-if-calculator.component.html',
  styleUrls: ['./what-if-calculator.component.scss']
})
export class WhatIfCalculatorComponent implements OnInit {

  constructor() { }

  whatIfForm = new FormGroup({
    currentBalance: new FormControl(200000),
    startDateTime: new FormControl('2007-07-02'), // format: yyyy-MM-dd
    endDateTime: new FormControl('2013-03-01'),   // format: yyyy-MM-dd
    symbol: new FormControl('SPY'),
    yearsWorked: new FormControl(30),
    moneyIsInMarket: new FormControl('true'),
  });

  handleWhatIfCalculatorSubmit(e) {
    e.preventDefault();
    const formValues = this.whatIfForm.value;

    const start = moment(formValues.startDateTime, 'YYYY-MM-DD').utc().startOf('day').unix();
    const end = moment(formValues.endDateTime, 'YYYY-MM-DD').utc().endOf('day').unix();

    const whatIfPayload = {
      currentBalance: formValues.currentBalance,
      start: start,
      end: end,
      symbol: formValues.symbol,
      yearsWorked: formValues.yearsWorked,
      isInMarket: Boolean(formValues.moneyIsInMarket),
    };

    debugger;
  }

  ngOnInit() {
  }
}

