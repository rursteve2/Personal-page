import React, { Component } from 'react';


class Contact extends Component {
    constructor() {
        super()
        this.state = {
            email: "",
            subject: "",
            body: ""
        }
    }

    handleTextInput = (event) => {
        const { name, value } = event.target;
        this.setState({[name]: value})
    }

    render() {
    return (
      <div className="contact">
            <h1 className='component-title'>Contact Me</h1>
            <input className="input-email" type="text" name="email" onChange={this.handleTextInput} placeholder='Email'/>
            <input className="input-subject" type="text" name="subject" onChange={this.handleTextInput} placeholder='Subject'/>
            <textarea className='input-content' type="text" name="body" onChange={this.handleTextInput} placeholder='Content'/>
            <a className='input-button' href={`mailto:chenstephen2@gmail.com?cc=${this.state.email}&subject=${this.state.subject}&body=${this.state.body}`}>Send</a>
      </div>
    );
  }
  }
  
  export default Contact;
  