import React from 'react';
import {store} from './store.js';
import {FileLink} from './Links.jsx';

class SourceCodeHeading extends React.Component {
    constructor(props) {
        void(props)
        super()
        this.state = {
                rendered_source_file_fullname: store._store.rendered_source_file_fullname,
                current_line_of_source_code: store._store.current_line_of_source_code
            }
        store.subscribe(this._store_change_callback.bind(this))
    }
    _store_change_callback(){
        this.setState({
                rendered_source_file_fullname: store._store.rendered_source_file_fullname,
                current_line_of_source_code: store._store.current_line_of_source_code
            })
    }
    render(){
        return(<FileLink fullname={this.state.rendered_source_file_fullname}
            file={this.state.rendered_source_file_fullname} line={this.state.current_line_of_source_code} />)
    }
}

export default SourceCodeHeading
