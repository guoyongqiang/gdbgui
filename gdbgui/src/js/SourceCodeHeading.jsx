import React from 'react';
import {store} from './store.js';
import {FileLink} from './Links.jsx';

class SourceCodeHeading extends React.Component {
    constructor(props) {
        void(props)
        super()
        this.state = {
                fullname_to_render: store._store.fullname_to_render,
                paused_on_frame: store._store.paused_on_frame,
                line_of_source_to_flash: store._store.line_of_source_to_flash,
            }
        store.subscribe(this._store_change_callback.bind(this))
    }
    _store_change_callback(){
        this.setState({
                fullname_to_render: store._store.fullname_to_render,
                paused_on_frame: store._store.paused_on_frame,
                line_of_source_to_flash: store._store.line_of_source_to_flash,
            })
    }
    render(){
        let line = this.state.paused_on_frame ? this.state.paused_on_frame.line : this.state.line_of_source_to_flash
        return(<FileLink
            fullname={this.state.fullname_to_render}
            file={this.state.fullname_to_render}
            line={line} />)
    }
}

export default SourceCodeHeading
