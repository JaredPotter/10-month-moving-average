import { Link } from "gatsby"
import PropTypes from "prop-types"
import React from "react"
import logo from "../images/logo-simple-investing.svg"
import "../pages/custom.scss"

const Header = ({ siteTitle }) => (
  <nav className="navbar" role="navigation" aria-label="main navigation">
    <div className="navbar-brand">
      <Link className="navbar-item" to="/">
        <img src={logo} width="112" height="28" />
      </Link>
    </div>
    <div id="signup" className="navbar-menu">
      <div className="navbar-end">
        <div className="navbar-item">
          <div className="buttons">
            <a href="#join" className="button is-primary">
              <strong>GET STARTED NOW</strong>
            </a>
          </div>
        </div>
      </div>
    </div>
  </nav>
)

Header.propTypes = {
  siteTitle: PropTypes.string,
}

Header.defaultProps = {
  siteTitle: ``,
}

export default Header
