import React, { Component } from 'react';


class Project1 extends Component {
    render() {
        return (
        <div className="project1">
            <div className="projectimgdiv">
                <img className="projectimg" src="https://i.imgur.com/anbbgxl.png" alt=""/>
            <p className="description">Play the game <a href="https://rursteve2.github.io/Project-1" target="_blank" rel="noopener noreferrer">here</a></p>
            </div>
            <div>
                <h2>Click the Dot!</h2>
                <p>Game made to test reaction speed. Made with Javascript, HTML, and CSS.</p>
            <h6>
                <a href="https://github.com/rursteve2/Project-1" target="_blank" rel="noopener noreferrer">
                    View it on Github
                </a>
            </h6>
            </div>
        </div>
        );
    }
  }
  
  export default Project1;
  