import React, { Component } from 'react';
import './App.css';
import Header from './components/Header'
import Body from './components/Body'
import Footer from './components/Footer'
import Contact from './components/Contact'


class App extends Component {
  render() {
    return (
      <div className="App">
        <Header />
        <Body />      
        <Contact />
        <Footer />
      </div>
    );
  }
}

export default App;
