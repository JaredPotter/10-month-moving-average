import React from "react"

import Layout from "../components/layout"
import SEO from "../components/seo"
import "./custom.scss"

const IndexPage = () => (
  <Layout>
    <SEO title="Home" />
    <section id="hero" className="hero is-black is-large">
      <div className="hero-body">
        <div className="container has-text-centered ">
          <h1 className="title is-1">Our Vision</h1>
          <h2 className=" subtitle is-2">
            To make investing simple for everyone - so you can focus on what's
            most important to you.
          </h2>
          <button className="button is-primary is-light is-large">
            <a href="#join">GET STARTED NOW</a>
          </button>
        </div>
      </div>
    </section>

    <section className="section is-large">
      <div className="container has-text-centered">
        <h1 className="title is-1">We Aren't Like the Other Guys!</h1>
        <table className="table table is-striped table is-fullwidth ">
          <thead>
            <tr>
              <th>Traditional Investing Is</th>
              <th>Simple Investing is</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>Complicated</th>
              <th>You know, Simple</th>
            </tr>
            <tr>
              <th>Challenging to Get Started</th>
              <th>Easy to Get Started</th>
            </tr>
            <tr>
              <th>Costly - High Fees</th>
              <th>FREE</th>
            </tr>
            <tr>
              <th>Stressful uncertainty</th>
              <th>Peace of Mind with Certainty</th>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section className="hero is-dark is-large">
      <div className="hero-body">
        <div className="container has-text-centered">
          <h1 className="title is-1">The Secret to Simple Investing</h1>
          <div className="content is-medium">
            <h3 className="title is-3">
              Broad Market Index Funds with Rock Bottom Fees
            </h3>
            <ul>
              <li>
                Warren Buffett's Famous Bet Proved low-fee, passively managed
                index funds (e.g., Vanguard S&P 500 and Total Stock Market
                funds) outperform actively managed funds. More recent research
                shows 78% of actively managed funds produced lower returns than
                the S&P 500.{" "}
              </li>
            </ul>
            <h3 className="title is-3">
              Simple Investing's Mathematically Proven
              SimpleInvesttngSignal&#8482;
            </h3>
            <ul>
              <li>
                Alone Broad Market Index Funds are good, but they become greater
                when combined with a clear, mathematically proven Signal on when
                to Get Out of the market and when to Get Into the market to
                preserve hard-earned wealth and maximize growth
              </li>
              <li>
                We at Simple Investing have performed extensive, accurate, and
                realistic historical testing on real market indicators (rather
                than speculative news and politics) to produce a simple Signal
                for you.
              </li>
            </ul>
          </div>
          <button className="button is-primary is-light is-large">
            <a href="#join">GET STARTED NOW</a>
          </button>
        </div>
      </div>
    </section>

    <section id="join" className="section is-large ">
      <div className="container has-text-centered ">
        <div className="content">
          <h1 className="title is-1">Subscribe to stay updated</h1>
          <div class="control has-icons-left has-icons-right has-text-centered">
            <input
              className="input"
              type="email"
              placeholder="Please Enter Your Email"
            />
            <button className="button is-info">SUBSCRIBE</button>
          </div>
        </div>
      </div>
    </section>
  </Layout>
)

export default IndexPage
