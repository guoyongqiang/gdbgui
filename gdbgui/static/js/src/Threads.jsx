import React from 'react';
import {ReactTable} from './ReactTable.jsx';
import {store} from './store.js';
import GdbApi from './GdbApi.js';
import {MemoryLink} from './Memory.jsx';
// import Memory from './Memory.js';

/**
 * The Threads component
 */
class FileLink extends React.Component {
    render(){
        return (
            <div>
                <span>{this.props.file}:{this.props.line} </span>
                <MemoryLink addr={this.props.addr} />
            </div>
        )
    }
}

class Threads extends React.Component {
    constructor(props) {
        void(props)
        super()
        this.state = store._store
        store.subscribe(this._store_change_callback.bind(this))
    }

    _store_change_callback(){
        this.setState(store._store)
    }

    static select_thread_id(thread_id){
        GdbApi.select_thread_id(thread_id)
    }

    static select_frame(framenum){
        GdbApi.select_frame(framenum)
        store.set('selected_frame_num', framenum)
        store.set('make_current_line_visible', true)
    }

    render(){
        if(this.state.threads.length <= 0) return <span className='placeholder'>not paused</span>

        let content = [];

        for(let thread of this.state.threads){
            let is_current_thread_being_rendered = (parseInt(thread.id) === this.state.current_thread_id)
            let stack = Threads.get_stack_for_thread(thread.frame, this.state.stack)
            let row_data = Threads.get_row_data_for_stack(stack, this.state.selected_frame_num, thread.frame.addr, thread.id, is_current_thread_being_rendered)
            content.push(Threads.get_thread_header(thread, is_current_thread_being_rendered))
            content.push(<ReactTable data={row_data} style={{'fontSize': "0.9em"}} key={thread.id}  />)
        }
        return <div>{content}</div>
    }

    static get_stack_for_thread(cur_frame, stack_data){
        // check if any frames of the stack match to the address of the frame we're rendering
        // if so, render the full stack for this thread
        for (let frame of stack_data){
            if(frame.addr === cur_frame.addr){
                return stack_data
            }
        }
        return [cur_frame]
    }

    static get_thread_header(thread, is_current_thread_being_rendered){
        // add thread name
        let onclick = ''
        , cls = ''
        if(is_current_thread_being_rendered){
            cls = 'bold'
        }else{
            onclick = ()=>{Threads.select_thread_id(thread.id)}
            cls = 'pointer'
        }
        return <span key={'thread'+thread.id} onClick={onclick} className={`${cls}`}>thread id {thread.id}, core {thread.core} ({thread.state})</span>
    }
    static get_frame_row(frame, is_selected_frame, thread_id, is_current_thread_being_rendered, frame_num){
        let onclick
        let classes = []

        if(is_selected_frame){
            // current frame, current thread
            onclick = ()=>{}
            classes.push('bold')
        }else if (is_current_thread_being_rendered){
            onclick = ()=>{Threads.select_frame(frame_num)}
            classes.push('pointer')
        }else{
            // different thread, allow user to switch threads
            onclick = ()=>{Threads.select_thread_id(thread_id)}
            classes.push('pointer')
        }
        let key = thread_id + frame_num
        return [<span key={key} className={classes.join(' ')} onClick={onclick}>{frame.func}</span>,
                // <span key={key + 1}>{frame.file}:{frame.line} {frame.addr}</span>,
                <FileLink file={frame.file} line={frame.line} addr={frame.addr} />
                ]
    }

    static get_row_data_for_stack(stack, selected_frame_num, paused_addr, thread_id, is_current_thread_being_rendered){
        let row_data = []
        let frame_num = 0
        for (let frame of stack){
            let is_selected_frame = (selected_frame_num === frame_num)
            row_data.push(Threads.get_frame_row(frame, is_selected_frame, thread_id, is_current_thread_being_rendered, frame_num))
            frame_num++
        }

        if(stack.length === 0){
            row_data.push(['unknown', 'unknown'])
        }
        return row_data
    }
    static update_stack(stack){
        store.set('stack', stack)
        store.set('paused_on_frame', stack[store.get('selected_frame_num') || 0])
        store.set('fullname_to_render', store.get('paused_on_frame').fullname)
        store.set('current_line_of_source_code', parseInt(store.get('paused_on_frame').line))
        store.set('current_assembly_address', store.get('paused_on_frame').addr)
        store.set('make_current_line_visible', true)
    }
    set_thread_id(id){
        store.set('current_thread_id',  parseInt(id))
    }
}

export default Threads
