import React, { Component } from 'react';


class Project4 extends Component {
    render() {
        return (
        <div className="project4">
            <div className="projectimgdiv">
                <img className="projectimg" src="https://i.imgur.com/ENIfc6R.png" alt=""/>
            <p className="description">Not deployed yet! Will be available <a href="#">here</a> when deployed.</p>
            </div>
            <div>
                <h2>Financial Tracker</h2>
                <p>A site to help keep track of personal finances by date. Uses React with Ruby on Rails.</p>
            <h6>
                <a href="https://github.com/rursteve2/FinancialTracker">
                    View it on Github
                </a>
            </h6>
            </div>
        </div>
        );
    }
  }
  
  export default Project4;
  