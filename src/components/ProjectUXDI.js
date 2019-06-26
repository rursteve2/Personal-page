import React, { Component } from 'react';

class ProjectUXDI extends Component {
    render() {
        return (
        <div className="projectuxdi">
            <div className="projectimgdiv">
                <img className="projectimg" src="https://i.imgur.com/8nkcBdw.png" alt=""/>
            <p className="description">Check out the site <a href="http://uxdi-sei-fetch.surge.sh" target="_blank" rel="noopener noreferrer">here</a></p>
            </div>
            <div>
                <h2>Fetch</h2>
                <p>A site to display pet information. Made in collaboration with a group of UX designers.</p>
            <h6>
                <a href="https://github.com/rursteve2/fetch" target="_blank" rel="noopener noreferrer">
                    View it on Github
                </a>
            </h6>
            </div>
        </div>
        );
    }
  }
  
  export default ProjectUXDI;
  