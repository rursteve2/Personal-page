import React, { Component } from 'react';
import Project1 from './Project1'
import Project2 from './Project2'
import Project3 from './Project3'
import ProjectUXDI from './ProjectUXDI'
import Project4 from './Project4'
import AboutMe from './AboutMe'


class Body extends Component {
    render() {
    return (
      <div className="body">
        <div className="name">
          <div className="bodyhead">
              <h1>Stephen Chen</h1>
              <h2>Full Stack Web Developer</h2>
          </div>
        </div>
        <AboutMe/>
        <Project1 />
        <Project2 />
        <Project3 />
        <ProjectUXDI />
        <Project4 />
      </div>
    );
  }
  }
  
  export default Body;
  