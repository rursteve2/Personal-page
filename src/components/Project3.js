import React, { Component } from 'react';


class Project3 extends Component {
    render() {
        return (
        <div className="project3">
            <div className="projectimgdiv">
                <img className="projectimg" src="https://i.imgur.com/OxrbQ8R.png" alt=""/>
            <p className="description">Check out the site <a href="http://photo-assembly.surge.sh" target="_blank">here</a></p>
            </div>
            <div>
                <h2>Photo Assembly</h2>
                <p>Instagram clone utilizing AWS with React and Express.</p>
            <h6>
                <a href="https://github.com/Juvi925/Photo_Assembly" target="_blank">
                    View it on Github
                </a>
            </h6>
            </div>
        </div>
        );
    }
  }
  
  export default Project3;
  