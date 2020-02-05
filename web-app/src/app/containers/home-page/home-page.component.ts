import { Component, OnInit } from "@angular/core";
import Chart from "chart.js";
import axios from "axios";

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

    axios
      .get(chartDataUrl)
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

  renderChart(data) {
    const labels = data.labels;
    const prices = data.prices;
    const averages = data.averages;
    var ctx = document.getElementById("myChart");
    this.setupChartPlugs();
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
      lineAtIndex: [50]
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
      renderVerticalLine: function (chartInstance, pointIndex) {
          const lineLeftOffset = this.getLinePosition(chartInstance, pointIndex);
          const scale = chartInstance.scales['y-axis-0'];
          const context = chartInstance.chart.ctx;

          // render vertical line
          context.beginPath();
          context.strokeStyle = '#ff0000';
          context.moveTo(lineLeftOffset, scale.top);
          context.lineTo(lineLeftOffset, scale.bottom);
          context.stroke();

          // write label
          context.fillStyle = "#ff0000";
          context.textAlign = 'center';
          context.fillText('MY TEXT', lineLeftOffset, (scale.bottom - scale.top) / 2 + scale.top);
      },

      afterDatasetsDraw: function (chart, easing) {
          if (chart.config.lineAtIndex) {
              chart.config.lineAtIndex.forEach(pointIndex => this.renderVerticalLine(chart, pointIndex));
          }
      }
      };

      Chart.plugins.register(verticalLinePlugin);
  }
}
