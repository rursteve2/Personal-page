import React, { Component } from 'react';
import './App.css';
import { Route, Switch } from 'react-router-dom'
import Header from './components/Header'
import Body from './components/Body'
import AboutMe from './components/AboutMe'


class App extends Component {
  render() {
    return (
      <div className="App">
        <Header />
      <h1>Portfolio</h1>
        <Switch>
          <Route exact path="/aboutme" render={() => <AboutMe />}/>
          <Route path="/" render={() => <Body />}/>
        </Switch>
      </div>
    );
  }
}

export default App;
