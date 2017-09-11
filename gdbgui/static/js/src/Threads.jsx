import React from 'react';
import {ReactTable} from './ReactTable.jsx';
import {store} from './store.js';
import GdbApi from './GdbApi.js';
// import Memory from './Memory.js';

/**
 * The Threads component
 */
// class Threads = {
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

    // init(){
    //     new Reactor('#threads', Threads.render)

    //     $("body").on("click", ".select_thread_id", Threads.click_select_thread_id)
    //     $("body").on("click", ".select_frame", Threads.click_select_frame)
    // }
    static select_thread_id(thread_id){
        GdbApi.run_gdb_command(`-thread-select ${thread_id}`)
        GdbApi.refresh_state_for_gdb_pause()
    }
    /**
     * select a frame and jump to the line in source code
     * triggered when clicking on an object with the "select_frame" class
     * must have data attributes: framenum, fullname, line
     *
     */
    click_select_frame(e){
        Threads.select_frame(e.currentTarget.dataset.framenum)
    }
    select_frame(framenum){
        window.dispatchEvent(new CustomEvent('event_select_frame', {'detail': parseInt(framenum)}))
    }


    render(){
        if(this.state.threads.length <= 0) return <span className='placeholder'>not paused</span>

        let body = []
        for(let t of this.state.threads){
            if(this.state.interpreter === 'lldb'){
                console.log('TODOLLDB - find current thread id')
            }

            let is_current_thread_being_rendered = (parseInt(t.id) === this.state.current_thread_id)
            , cls = ''

            // add thread name
            let onclick = ''
            if(is_current_thread_being_rendered){
                // pass
                cls = 'bold'
            }else{
                onclick = ()=>{Threads.select_thread_id(t.id)}
                cls = 'pointer'
            }

            let thread_text =
                <div key={t.id}>
                    <span onClick={onclick} className={`${cls}`}>thread id {t.id}, core {t.core} ({t.state})</span>
                    <br key={t.id}/>
                </div>
            body.push(thread_text)

            if(is_current_thread_being_rendered || store.get('interpreter') === 'lldb'){
                // add stack if current thread
                for (let s of this.state.stack){
                    if(s.addr === t.frame.addr){
                        body.push(Threads.get_stack_table(
                            this.state.stack,
                            this.state.selected_frame_num,
                            t.frame.addr,
                            is_current_thread_being_rendered,
                            t.id))
                        break
                    }
                }
            }else{
                // add frame if not current thread
                body.push(Threads.get_stack_table([t.frame], this.state.selected_frame_num, '', is_current_thread_being_rendered, t.id))
            }
        }
        return <div>{body}</div>
    }

    static get_stack_table(stack, selected_frame_num, cur_addr, is_current_thread_being_rendered, thread_id){
        void(thread_id)
        var frame_num = 0
        let table_data = []
        for (let s of stack){

            // let arrow = (cur_addr === s.addr) ? `<span class='glyphicon glyphicon-arrow-right' style='margin-right: 4px;'></span>` : ''
            let cls = []
            if(selected_frame_num === frame_num && is_current_thread_being_rendered){
                cls.push('bold')
            }

            let function_name = <span className={cls.join(' ')}>{s.func}</span>
            console.log(s.fullname)
            table_data.push([function_name, <span>{s.file}:{s.line} {s.addr}</span>])
            frame_num++
        }

        if(stack.length === 0){
            table_data.push(['unknown', 'unknown'])
        }

        const header = ['function name', 'location']
        return <ReactTable data={table_data} header={header} style={{'fontSize': "0.9em"}} key={cur_addr}  />
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
