import React from 'react';
import {store} from './store.js';
import {FileLink} from './Links.jsx';

class SourceCodeHeading extends React.Component {
    constructor(props) {
        void(props)
        super()
        this.state = {
                rendered_source: store._store.rendered_source,
            }
        store.subscribe(this._store_change_callback.bind(this))
    }
    _store_change_callback(){
        this.setState({
                rendered_source: store._store.rendered_source,
            })
    }
    render(){
        return(<FileLink
            fullname={this.state.rendered_source.fullname}
            file={this.state.rendered_source.fullname}
            line={this.state.rendered_source.line} />)
    }
}

export default SourceCodeHeading
