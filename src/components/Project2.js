import React, { Component } from 'react';


class Project2 extends Component {
    render() {
        return (
        <div className="project2">
            <div className="projectimgdiv">
                <img className="projectimg" src="https://i.imgur.com/gpPpFbf.png" alt=""/>
            <p className="description">Check out the site <a href="https://sei-lol-api.herokuapp.com">here</a>. API key expires every 24 hours. Get an API key <a href="https://developer.riotgames.com/">here</a></p>
            </div>
            <div>
                <h2>League of Legends Lookup</h2>
                <p>Look up League of Legends usernames to display recent game information. React, Javascript, and CSS.</p>
            <h6>
                <a href="https://github.com/rursteve2/LeagueOfLegends-api">
                    View it on Github
                </a>
            </h6>
            </div>
        </div>
        );
    }
  }
  
  export default Project2;
  