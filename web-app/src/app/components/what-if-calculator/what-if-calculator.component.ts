import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import * as moment from 'moment';
import axios from 'axios';

import taxBrackets from '../../../capitalGainsTax';

@Component({
  selector: 'app-what-if-calculator',
  templateUrl: './what-if-calculator.component.html',
  styleUrls: ['./what-if-calculator.component.scss']
})
export class WhatIfCalculatorComponent implements OnInit {

  constructor() { }

  years = [];

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

  getBrackets(year: number) {
    const brackets = [];
    const yearBracket = taxBrackets[year];

    if(yearBracket) {
      for(let i = 0; i < yearBracket.brackets.length; i++) {
        const bracket = yearBracket.brackets[i];
        const rangeLabel = `$${bracket.minBracketValue} - $${bracket.maxBracketValue}`;

        const b = {
          year,
          index: i,
          rangeLabel,
        };

        brackets.push(b);
      }
    }

    return brackets;
  }

  ngOnInit() {
    const start = moment(this.whatIfForm.value.startDateTime, 'YYYY-MM-DD');
    let current = moment(start);
    const end = moment(this.whatIfForm.value.endDateTime, 'YYYY-MM-DD');

    while(current.isSameOrBefore(end, 'year')) {
      this.years.push(current.year());
      current.add(1, 'year');
    }
  }
}

