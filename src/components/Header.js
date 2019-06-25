import React, { Component } from 'react';

class Header extends Component {
  render() {
    return (
      <div className="header">
        <div className="contacticons">
          <a href="https://github.com/rursteve2" target="_blank"><i className="fab fa-github-square"></i></a>
          <a href="https://www.linkedin.com/in/chenstephen2" target="_blank"><i className="fab fa-linkedin"></i></a>
          <a href="mailto:chenstephen2@gmail.com" target="_blank">
          <i className="fas fa-envelope-square"></i></a>
        </div>
      </div>
    );
  }
}

export default Header;
