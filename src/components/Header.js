import React, { Component } from 'react';
import { Link } from 'react-router-dom'

class Header extends Component {
  render() {
    return (
      <div>
        <Link to="/">
          <div>
            Home
          </div>
        </Link>
      <Link to="/aboutme">
        <div className="headerlinks">
          About Me
        </div>
      </Link>
      <a href="mailto:chenstephen2@gmail.com">
      <div>
        Contact Me
        </div>
      </a>
      </div>
    );
  }
}

export default Header;
