import {store} from './store.js';
import React from 'react';
import GdbApi from './GdbApi.js';
import Util from './Util.js';
import Memory from './Memory.js';

/**
 * Component to render a status message with optional error/warning label
 */
// class Threads extends React.Component {
//     constructor(props) {
//         void(props)
//         super();
//         this.state = store.get()
//         store.subscribe(this._store_change_callback.bind(this))
//     }

//     _store_change_callback(){
//         this.setState(store.get())
//     }

//     // statc method to update the store with mi object
//     static render_from_gdb_mi_response(mi_obj){
//         if(!mi_obj){
//             return
//         }
//         // Update status
//         let status = [],
//             error = false
//         if (mi_obj.message){
//             if(mi_obj.message === 'error'){
//                 error = true
//             }else{
//                 status.push(mi_obj.message)
//             }
//         }
//         if (mi_obj.payload){
//             let err_text_array = Util.get_err_text_from_mi_err_response(mi_obj)
//             status = status.concat(err_text_array)
//         }
//         store.set('status', {'text': status.join(', '), 'error': error})
//     }

//     render() {
//         if(this.state.waiting_for_response){
//             return (<span className='glyphicon glyphicon-refresh glyphicon-refresh-animate'></span>)
//         }else{
//             let prefix = '';
//             if(this.state.status.error){
//                 prefix = <span className='label label-danger'>error</span>
//             }else if (this.state.status.warning){
//                 prefix = <span className='label label-warning'>warning</span>
//             }
//             return (
//                 <div >
//                     {prefix}<span>&nbsp;</span>
//                     <span>{this.state.status.text}</span>
//                 </div>
//             );
//         }
//     }
// }

// export default Threads;


/**
 * The Threads component
 */
// class Threads = {
class Threads extends React.Component {
    constructor(props) {
        void(props)
        super();
        this.state = store.get()
        store.subscribe(this._store_change_callback.bind(this))
    }

    _store_change_callback(){
        this.setState(store.get())
    }

    // init(){
    //     new Reactor('#threads', Threads.render)

    //     $("body").on("click", ".select_thread_id", Threads.click_select_thread_id)
    //     $("body").on("click", ".select_frame", Threads.click_select_frame)
    // }
    click_select_thread_id(e){
        GdbApi.run_gdb_command(`-thread-select ${e.currentTarget.dataset.thread_id}`)
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
        if(this.state.threads.length > 0){
            let body = []
            for(let t of this.state.threads){
                if(this.state.interpreter === 'lldb'){
                    console.log('TODOLLDB - find current thread id')
                }

                let is_current_thread_being_rendered = (parseInt(t.id) === this.state.current_thread_id)
                , cls = is_current_thread_being_rendered ? 'bold' : ''

                let thread_text = <span className='{cls}'>thread id {t.id}, core {t.core} ({t.store})</span>
                // add thread name
                if(is_current_thread_being_rendered){
                    body.push(thread_text)
                }else{
                    // add class to allow user to click and select this thread
                    body.push(
                        <div>
                            <span class='select_thread_id pointer' data-thread_id='{t.id}'>
                                {thread_text}
                            </span>
                        <br/>
                        </div>
                        )
                }

            //     if(is_current_thread_being_rendered || store.get('interpreter') === 'lldb'){
            //         // add stack if current thread
            //         for (let s of store.get('stack')){
            //             if(s.addr === t.frame.addr){
            //                 body.push(Threads.get_stack_table(store.get('stack'), t.frame.addr, is_current_thread_being_rendered, t.id))
            //                 break
            //             }
            //         }
            //     }else{
            //         // add frame if not current thread
            //         body.push(Threads.get_stack_table([t.frame], '', is_current_thread_being_rendered, t.id))
            //     }
            // }

            // return body.join('')
        // }else{
            // return '<span class=placeholder>not paused</span>'
        // }
           }
            return(
                <div>
                    {body}
                </div>
            )
        }
        return(
            <span className='placeholder'>not paused</span>
        )
    }

    get_stack_table(stack, cur_addr, is_current_thread_being_rendered, thread_id){
        let _stack = $.extend(true, [], stack)
            , table_data = []

        var frame_num = 0
        for (let s of _stack){

            // let arrow = (cur_addr === s.addr) ? `<span class='glyphicon glyphicon-arrow-right' style='margin-right: 4px;'></span>` : ''
            let bold = (store.get('selected_frame_num') === frame_num && is_current_thread_being_rendered) ? 'bold' : ''
            let attrs = is_current_thread_being_rendered ? `class="select_frame pointer ${bold}"` : `class="select_thread_id pointer ${bold}" data-thread_id=${thread_id}`
                , function_name =`
                <span ${attrs} data-framenum=${s.level}>
                    ${s.func}
                </span>`

            table_data.push([function_name, `${s.file}:${s.line} ${Memory.make_addrs_into_links(s.addr)}`])
            frame_num++
        }
        if(_stack.length === 0){
            table_data.push(['unknown', 'unknown'])
        }
        return Util.get_table([], table_data, 'font-size: 0.9em;')
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
