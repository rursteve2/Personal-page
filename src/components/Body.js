import React, { Component } from 'react';
import Project1 from './Project1'
import Project2 from './Project2'
import Project3 from './Project3'
import ProjectUXDI from './ProjectUXDI'
import Project4 from './Project4'


class Body extends Component {
    render() {
    return (
      <div className="personalinfo">
        <h1 className="name">Stephen Chen</h1>
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
  