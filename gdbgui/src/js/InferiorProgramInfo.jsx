import React from 'react'
import Actions from './Actions.js'
import {store} from './store.js'

class InferiorProgramInfo extends React.Component {

    constructor() {
        super()
        this.state = {inferior_pid: store._store.inferior_pid}
        store.subscribe(this._store_change_callback.bind(this))
    }

    _store_change_callback(){
        this.setState({inferior_pid: store._store.inferior_pid})
    }

    static send_signal(signal_name, pid){
        $.ajax({
            url: "/send_signal_to_pid",
            cache: false,
            type: 'GET',
            data: {signal_name: signal_name, pid: pid},
            success: function(response){
                console.log(response)
                store.set('status', {text: response.message, error: false, warning: false})
                Actions.refresh_state_for_gdb_pause()
            },
            error: function(response){
                if (response.responseJSON && response.responseJSON.message){
                    store.set('status', {'text': _.escape(response.responseJSON.message), 'error': true})
                }else{
                    store.set('status', {'text': `${response.statusText} (${response.status} error)`, 'error': true})
                }
                console.error(response)
            },
            complete: function(){
            }
        })
    }
            // TODO add all these
            // {'sigabrt': 6,
            //  'sigalrm': 14,
            //  'sigbus': 7,
            //  'sigchld': 17,
            //  'sigcld': 17,
            //  'sigcont': 18,
            //  'sigfpe': 8,
            //  'sighup': 1,
            //  'sigill': 4,
            //  'sigint': 2,
            //  'sigio': 29,
            //  'sigiot': 6,
            //  'sigkill': 9,
            //  'sigpipe': 13,
            //  'sigpoll': 29,
            //  'sigprof': 27,
            //  'sigpwr': 30,
            //  'sigquit': 3,
            //  'sigrtmax': 64,
            //  'sigrtmin': 34,
            //  'sigsegv': 11,
            //  'sigstop': 19,
            //  'sigsys': 31,
            //  'sigterm': 15,
            //  'sigtrap': 5,
            //  'sigtstp': 20,
            //  'sigttin': 21,
            //  'sigttou': 22,
            //  'sigurg': 23,
            //  'sigusr1': 10,
            //  'sigusr2': 12,
            //  'sigvtalrm': 26,
            //  'sigwinch': 28,
            //  'sigxcpu': 24,
            //  'sigxfsz': 25}
    render(){

        if(this.state.inferior_pid){
                return(
                    <div>
                        <span>inferior program: PID {this.state.inferior_pid}</span>
                        <br/>
                        <span>send to inferior </span>

                        <select id="signal_selection" onChange={(e)=>console.log(e)}>
                          <option value="SIGKILL" selected>SIGKILL</option>
                          <option value="SIGINT">SIGINT</option>


                        </select>

                        <button className='btn btn-default btn-xs'
                                    id='step_instruction_button'
                                    type='button'
                                    title={`Send signal to pid ${this.state.inferior_pid}`}
                                    onClick={()=>{
                                        let el = document.getElementById("signal_selection")
                                        let signal = el.options[el.selectedIndex].value;
                                        InferiorProgramInfo.send_signal(signal, this.state.inferior_pid)
                                        }
                                    }
                                >
                                    send
                        </button>
                    </div>)
        }else{
            return <span>no inferior program running</span>
        }
    }
}

export default InferiorProgramInfo
