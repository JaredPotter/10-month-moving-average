import { Component, OnInit } from "@angular/core";
import Chart from "chart.js";
import axios from "axios";
import * as moment from 'moment';
import { Moment } from 'moment';

@Component({
  selector: "app-home-page",
  templateUrl: "./home-page.component.html",
  styleUrls: ["./home-page.component.scss"]
})
export class HomePageComponent implements OnInit {
  constructor() {}

  public latestTitle = "";
  public latestAverage = "";
  public latestPrice = "";
  public marketStatus = "";
  public symbolName = "";
  public symbolId = "";

  public chartOptions = {};

  ngOnInit() {
    // var ctx = document.getElementById('myChart');
    // debugger;
    // const chartOptions = {
    //   type: 'line',
    //   data: {
    //       labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
    //       datasets: [{
    //           label: 'S&P 500 Price',
    //           data: [12, 19, 3, 5, 2, 3],
    //           borderColor: [
    //               '#3382EA'
    //           ],
    //           fill: false,
    //       },
    //       {
    //         label: 'S&P 500 10 Month Moving Average',
    //         data: [1, 3, 5, 14, 17, 12],
    //         borderColor: '#A375F7',
    //         fill: false,
    //       }

    //     ]
    //   },
    //   options: {
    //       scales: {
    //           yAxes: [{
    //               ticks: {
    //                   beginAtZero: true
    //               }
    //           }]
    //       }
    //   }
    // };
    // var myChart = new Chart(ctx, chartOptions);

    // return;
    const symbolId = "SPY";

    this.symbolId = symbolId;

    this.fetchData(symbolId, null, null);

  }

  fetchData(symbolId: string, startDate: Moment = null, endDate: Moment = null): void {
    const url = `https://us-central1-month-mov-avg-notifier.cloudfunctions.net/latestTenMonthMovingAverage?id=${symbolId}`;

    axios
      .get(url)
      .then(response => {
        const latestAverage = response.data.latestAverage;

        this.symbolName = response.data.name;
        this.symbolId = response.data.id;
        this.latestTitle = latestAverage.title;
        this.latestAverage = latestAverage.average;
        this.latestPrice = latestAverage.closingDayPrice;

        if (this.latestPrice > this.latestAverage) {
          this.marketStatus = "IN";
        } else if (this.latestPrice < this.latestAverage) {
          this.marketStatus = "OUT";
        }
      })
      .catch(error => {
        console.log(error);
        debugger;
      });

    // Fetch Chart Data
    const chartDataUrl = `https://us-central1-month-mov-avg-notifier.cloudfunctions.net/tenMonthMovingAverages?id=${symbolId}`;
    const labels = [];
    const prices = [];
    const averages = [];

    const params = new URLSearchParams();

    if(startDate && endDate) {
      const start = startDate.utc().startOf('day').unix();
      const end = endDate.utc().startOf('day').unix();

      params.append('start', start.toString());
      params.append('end', end.toString());
    }

    axios
      .get(chartDataUrl, { params })
      .then(response => {
        const aves = response.data.averages;

        for (let i = 0; i < aves.length; i++) {
          const ave = aves[i];
          const label = ave.title;
          const price = ave.closingDayPrice;
          const average = ave.average;

          labels.push(label);
          prices.push(price);
          averages.push(average);
        }

        const data = {
          labels,
          prices,
          averages
        };

        this.renderChart(data);
      })
      .catch(error => {
        console.log(error);
        debugger;
      });
  }

  handleChartOptionClick(action: string): void {
    let startDate = null
    let endDate = null;

    switch(action) {
      case 'all':
        this.fetchData(this.symbolId, null, null);
        break;
      case '2000':
        startDate = moment.utc('04/03/2000');
        endDate = moment.utc('06/01/2007');
        debugger;
        this.fetchData(this.symbolId, startDate, endDate);
        break;
      case '2007':
        startDate = moment();
        endDate = moment();
        break;
    }
  }

  renderChart(data) {
    const labels = data.labels;
    const prices = data.prices;
    const averages = data.averages;
    var ctx = document.getElementById("myChart");
    this.setupChartPlugs();


    // Calculate BUY and SELL indexes
    let isInMarket = false;
    const sellIndexes = [];
    const buyIndexes = [];

    if(prices[0] >= averages[0]) {
      isInMarket = true;
    }

    for(let i = 0; i < prices.length; i++) {
      const price = prices[i];
      const average = averages[i];
// debugger;
      if(price >= average && isInMarket) {
        // debugger;
        // Do nothing. Remain in the market.
      }
      else if(average >= price && isInMarket) {
        // SELL
        isInMarket = false;
        sellIndexes.push(i);
      }
      else if(price >= average && !isInMarket) {
        // BUY
        isInMarket = true;
        buyIndexes.push(i);
      }
      else if(averages >= price && !isInMarket) {
        // Do nothing. Remain out of the market.
      }
    }

    // debugger;
    const chartOptions = {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "S&P 500 Price",
            data: prices,
            borderColor: "#3382EA",
            backgroundColor: "#3382EA",
            fill: false,
            pointRadius: 0
          },
          {
            label: "S&P 500 10 Month Moving Average",
            data: averages,
            borderColor: "#A375F7",
            backgroundColor: "#A375F7",
            fill: false,
            pointRadius: 0
          }
        ]
      },
      options: {
        scales: {
          yAxes: [
            {
              ticks: {
                callback: function(value, index, values) {
                  return "$" + value;
                }
              }
            }
          ]
        },
        tooltips: {
          displayColors: true,
          mode: "index",
          callbacks: {
            label: function(tooltipItem, data) {
              let label = data.datasets[tooltipItem.datasetIndex].label || "";

              if (label) {
                label += ": $";
              }

              label += Math.round(tooltipItem.yLabel * 100) / 100;

              return label;
            }
          }
        }
      },
      lineAtIndex: [
        {
          label: 'BUY',
          color: '#8DC045',
          indexes: buyIndexes
        },
        {
          label: 'SELL',
          color: '#ff0000',
          indexes: sellIndexes
        },
      ]
    };
    var myChart = new Chart(ctx, chartOptions);
  }

  setupChartPlugs() {
    const verticalLinePlugin = {
      getLinePosition: function (chart, pointIndex) {
          const meta = chart.getDatasetMeta(0); // first dataset is used to discover X coordinate of a point
          const data = meta.data;
          return data[pointIndex]._model.x;
      },
      renderVerticalLine: function (chartInstance, pointIndex, pointItem) {
          const lineLeftOffset = this.getLinePosition(chartInstance, pointIndex);
          const scale = chartInstance.scales['y-axis-0'];
          const context = chartInstance.chart.ctx;

          // debugger;

          // render vertical line
          context.beginPath();
          context.strokeStyle = pointItem.color;
          context.moveTo(lineLeftOffset, scale.top);
          context.lineTo(lineLeftOffset, scale.bottom);
          context.stroke();

          // write label
          context.fillStyle = pointItem.color;
          context.textAlign = 'center';
          context.fillText(pointItem.label, lineLeftOffset, (scale.bottom - scale.top) / 2 + scale.top);
      },

      afterDatasetsDraw: function (chart, easing) {
          if (chart.config.lineAtIndex) {
            for(let pointCollection of chart.config.lineAtIndex) {
              const indexes = pointCollection.indexes;

              indexes.forEach((pointIndex) => {
                const pointItem = pointCollection;
                this.renderVerticalLine(chart, pointIndex, pointItem);
              });
            }
          }
      }
    };

    Chart.plugins.register(verticalLinePlugin);
  }
}
