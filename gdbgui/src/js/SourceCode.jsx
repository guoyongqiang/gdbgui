import {store} from './store.js';
import React from 'react';
import FileOps from './FileOps.js';
import Breakpoint from './Breakpoint.jsx';
import MemoryLink from './MemoryLink.jsx';
import constants from './constants.js';

class SourceCode extends React.Component {
    static el_code_container = $('#code_container')  // todo: no jquery

    constructor() {
        super()

        // bind methods
        this.get_body_assembly_only = this.get_body_assembly_only.bind(this)
        this._get_source_line = this._get_source_line.bind(this)
        this._get_assm_line = this._get_assm_line.bind(this)
        this.click_gutter = this.click_gutter.bind(this)
        this.is_paused_on_this_line = this.is_paused_on_this_line.bind(this)

        this.state = this._get_applicable_global_state()
        store.subscribe(this._store_change_callback.bind(this))
    }


    _store_change_callback(){
        this.setState(this._get_applicable_global_state())
    }
    _get_applicable_global_state(){
        return {
            fullname_to_render: store._store.fullname_to_render,
            cached_source_files: store._store.cached_source_files,
            missing_files: store._store.missing_files,
            disassembly_for_missing_file: store._store.disassembly_for_missing_file,
            line_of_source_to_flash: store._store.line_of_source_to_flash,
            paused_on_frame: store._store.paused_on_frame,
            breakpoints: store._store.breakpoints,
            source_code_state: store._store.source_code_state,
        }
    }
    click_gutter(line_num){
        Breakpoint.toggle_breakpoint(this.state.fullname_to_render, line_num)
    }
    _get_source_line(source, line_should_flash, is_paused_on_this_line, line_num_being_rendered, has_bkpt, has_disabled_bkpt){
        let row_class = ['srccode']

        let id
        if(is_paused_on_this_line){
            row_class.push('paused_on_line')
            id = 'scroll_to_line'
        }else if(line_should_flash){
            row_class.push('flash')
            id = ''
        }

        let gutter_cls = ''
        if(has_bkpt){
            gutter_cls = 'breakpoint'
        }else if (has_disabled_bkpt){
            gutter_cls = 'disabled_breakpoint'
        }


        return (
            <tr id={id} key={line_num_being_rendered} className={`${row_class.join(' ')}`}>

                <td style={{'verticalAlign': 'top', width: '30px'}} className={'line_num ' + gutter_cls} onClick={()=>{this.click_gutter(line_num_being_rendered)}}>
                    <div>{line_num_being_rendered}</div>
                </td>

                <td style={{'verticalAlign': 'top'}} className="loc">
                    <span className='wsp' dangerouslySetInnerHTML={{__html: source}}></span>
                </td>

            </tr>)
    }

    _get_assm_line(key, assm){
        return (
            <tr key={key}>
            <td>
                <span style={{'whiteSpace': "nowrap"}}>
                    TODO instruction {assm.opcodes || 'no opcode'} {assm['func-name']}+{assm.offset} <MemoryLink addr={assm.address} />
                </span>
            </td>
            </tr>
        )
    }

    is_paused_on_this_line(line_num_being_rendered, gdb_paused_on_line){
        if(this.state.paused_on_frame){
            return (line_num_being_rendered === gdb_paused_on_line &&
                    this.state.paused_on_frame.fullname === this.state.fullname_to_render)
        }else{
            return false
        }
    }

    get_body_source_only(source_code){
        let body = []

        let bkpt_lines = Breakpoint.get_breakpoint_lines_for_file(this.state.fullname_to_render)
        , disabled_breakpoint_lines = Breakpoint.get_disabled_breakpoint_lines_for_file(this.state.fullname_to_render)

        let gdb_paused_on_line = this.state.paused_on_frame ? parseInt(this.state.paused_on_frame.line) : 0
        for (let i = 0; i < source_code.length; i++){

            let line_num_being_rendered = i + 1
            let has_bkpt = bkpt_lines.indexOf(line_num_being_rendered) !== -1
            let has_disabled_bkpt = disabled_breakpoint_lines.indexOf(line_num_being_rendered) !== -1
            let is_paused_on_this_line = this.is_paused_on_this_line(line_num_being_rendered, gdb_paused_on_line)

            body.push(this._get_source_line(source_code[i],
                this.state.line_of_source_to_flash === line_num_being_rendered,
                is_paused_on_this_line,
                line_num_being_rendered,
                has_bkpt,
                has_disabled_bkpt))
        }
        return body
    }

    get_body_source_and_assembly(){
    }

    get_body_assembly_only(){
        let assm_array = this.state.disassembly_for_missing_file
        let body = []
        let i = 0
        for(let assm of assm_array){
            body.push(this._get_assm_line(i, assm))
            i++
        }
        return body
    }

    get_body_empty(){
        return(<tr><td></td></tr>)
    }

    get_body(){
        const states = constants.source_code_states
        switch(this.state.source_code_state){
            case states.ASSM_AND_SOURCE_CACHED:{
                return(<tr><td>todo: render assm and source</td></tr>)
            }
            case states.SOURCE_CACHED:{
                let obj = FileOps.get_source_file_obj_from_cache(this.state.fullname_to_render)
                if(!obj){
                    return this.get_body_empty()
                }
                return this.get_body_source_only(obj.source_code)
            }
            case states.FETCHING_SOURCE:{
                return(<tr><td>fetching source, please wait</td></tr>)
            }
            case states.ASSM_CACHED:{
                return this.get_body_assembly_only()
            }
            case states.FETCHING_ASSM:{
                return(<tr><td>fetching assembly, please wait</td></tr>)
            }
            case states.NONE_AVAILABLE:{
                return this.get_body_empty()
            }
            default:{
                return this.get_body_empty()
            }
        }

    }
    render(){
        return(<table id='code_table' style={{width: '100%', 'height': '100%'}}>
                <tbody id='code_body' className={store.get('current_theme')}>
                    {this.get_body()}
                </tbody>
            </table>)
    }

    // componentDidUpdate(){
    //     if (this.state.source_code_state === constants.source_code_states.SOURCE_CACHED || this.state.source_code_state === constants.source_code_states.ASSM_AND_SOURCE_CACHED){
    //         if (this.state.make_current_line_visible){
    //             SourceCode.make_current_line_visible()
    //         }
    //     }

    //     // this.setState({'make_current_line_visible': false})
    // }
    static make_current_line_visible(){
        console.log('make current line visible!')
        SourceCode.scroll_to_jq_selector($("#scroll_to_line"))
    }
    /**
     * Scroll to a jQuery selection in the source code table
     * Used to jump around to various lines
     */
    static scroll_to_jq_selector(jq_selector){
        if (jq_selector.length === 1){  // make sure something is selected before trying to scroll to it
            let top_of_container = SourceCode.el_code_container.position().top,
                height_of_container = SourceCode.el_code_container.height(),
                bottom_of_container = top_of_container + height_of_container,
                top_of_line = jq_selector.position().top,
                bottom_of_line = top_of_line+ jq_selector.height(),
                top_of_table = jq_selector.closest('table').position().top

            if ((top_of_line >= top_of_container) && (bottom_of_line < (bottom_of_container))){
                // do nothing, it's already in view
            }else{
                // line is out of view, scroll so it's in the middle of the table
                const time_to_scroll = 0
                let scroll_top = top_of_line - (top_of_table + height_of_container/2)
                SourceCode.el_code_container.animate({'scrollTop': scroll_top}, time_to_scroll)
            }
        }else{
            // nothing to scroll to
        }
    }
//         void(reactor)
//         let fullname = store.get('fullname_to_render')
//         if(fullname && store.get('missing_files').indexOf(fullname) === -1){
//             SourceCode.render_breakpoints()
//             SourceCode.highlight_paused_line()
//             if(store.get('make_current_line_visible')){
//                 SourceCode.make_current_line_visible()
//             }
//         }
//         store.set('make_current_line_visible', false)
//         store.set('has_unrendered_assembly', false)

    static view_file(fullname, line){
        store.set('fullname_to_render', fullname)
        store.set('line_of_source_to_flash', parseInt(line))
        store.set('make_current_line_visible', true)
    }
    // get_render_state(){
    //     if (FileOps.is_cached(this.state.fullname_to_render)){
    //         return 'SOURCE'
    //     }

    //     let paused_addr = this.state.paused_on_frame ? this.state.paused_on_frame.addr : null
    //     if (this.state.disassembly_for_missing_file.some(obj => obj.address === paused_addr)){
    //         return 'ASSM'
    //     }

    //     return 'EMPTY'
    // }

    // TODO deprecate
    static get_attrs_to_view_file(fullname, line=0){
        return `class='view_file pointer' data-fullname=${fullname} data-line=${line}`
    }

}

// const SourceCode2 = {
//     el_code_container: $('#code_container'),
//     el_jump_to_line_input: $('#jump_to_line'),
//     init: function(){

//         new Reactor('#code_table', SourceCode.render, {should_render: SourceCode.should_render, after_render: SourceCode.after_render})

//         $("body").on("click", ".srccode td.line_num", SourceCode.click_gutter)
//         $("body").on("click", ".view_file", SourceCode.click_view_file)
//         $('.fetch_assembly_cur_line').click(SourceCode.fetch_assembly_cur_line)
//         $('#refresh_cached_source_files').click(SourceCode.refresh_cached_source_files)
//         SourceCode.el_jump_to_line_input.keydown(SourceCode.keydown_jump_to_line)

//     },
//     inferior_program_exited: function(){
//         SourceCode.remove_line_highlights()
//     },
//     event_inferior_program_running: function(){
//         SourceCode.remove_line_highlights()
//     },
//     click_gutter: function(e){
//         let line = e.currentTarget.dataset.line
//         if(e.currentTarget.classList.contains('breakpoint') || e.currentTarget.classList.contains('breakpoint_disabled')){
//             // clicked gutter with a breakpoint, remove it
//             Breakpoint.remove_breakpoint_if_present(store.get('rendered_source_file_fullname'), line)

//         }else{
//             // clicked with no breakpoint, add it, and list all breakpoints to make sure breakpoint table is up to date
//             let fullname = store.get('rendered_source_file_fullname')
//             GdbApi.run_gdb_command(GdbApi.get_insert_break_cmd(fullname, line))
//         }
//     },
//     /**
//      * Return html that can be displayed alongside source code
//      * @param show_assembly: Boolean
//      * @param assembly: Array of assembly data
//      * @param line_num: line for which assembly html should be returned
//      * @returns two <td> html elements with appropriate assembly code
//      */
//     get_assembly_html_for_line: function(show_assembly, assembly, line_num, addr){
//         let instruction_content = []

//         if(show_assembly && assembly[line_num]){

//             let instructions_for_this_line = assembly[line_num]
//             for(let i of instructions_for_this_line){
//                 let cls = (addr === i.address) ? 'current_assembly_command assembly' : 'assembly'
//                 , addr_link = Memory.make_addrs_into_links(i.address)
//                 , instruction = Memory.make_addrs_into_links(Util.escape(i.inst))
//                 , opcodes = i.opcodes ? `(${i.opcodes})` : ''
//                 instruction_content.push(`
//                     <span style="white-space: nowrap;" class='${cls}' data-addr=${i.address}>
//                         ${instruction}${opcodes} ${i['func-name']}+${i['offset']} ${addr_link}
//                     </span>`)
//                 // i.e. mov $0x400684,%edi(00) main+8 0x0000000000400585
//             }
//         }

//         return `
//         <td valign="top" class='assembly'>
//             ${instruction_content.join('<br>')}
//         </td>`
//     },
//     _get_assembly_html: function(cur_addr, i){
//         let cls = (cur_addr === i.address) ? 'current_assembly_command assembly' : 'assembly'
//         , addr_link = Memory.make_addrs_into_links(i.address)
//         , instruction = Memory.make_addrs_into_links(i.inst)

//         return `<span style="white-space: nowrap;" class='${cls}' data-addr=${i.address}>
//             ${instruction}(${i.opcodes}) ${i['func-name']}+${i['offset']} ${addr_link}
//         </span>`
//     },
//     /**
//      * Show modal warning if user is trying to show a file that was modified after the binary was compiled
//      */
//     show_modal_if_file_modified_after_binary(fullname){
//         let obj = SourceCode.get_source_file_obj_from_cache(fullname)
//         if(obj && store.get('inferior_binary_path')){
//             if((obj.last_modified_unix_sec > store.get('inferior_binary_path_last_modified_unix_sec'))
//                     && store.get('warning_shown_for_old_binary') !== true){
//                 Modal.render('Warning', `A source file was modified <bold>after</bold> the binary was compiled. Recompile the binary, then try again. Otherwise the source code may not
//                     match the binary.
//                     <p>
//                     <p>Source file: ${fullname}, modified ${moment(obj.last_modified_unix_sec * 1000).format(constants.DATE_FORMAT)}
//                     <p>Binary: ${store.get('inferior_binary_path')}, modified ${moment(store.get('inferior_binary_path_last_modified_unix_sec') * 1000).format(constants.DATE_FORMAT)}`)
//                 store.set('warning_shown_for_old_binary', true)
//             }
//         }
//     },
//     set_theme_in_dom: function(){
//         let code_container = SourceCode.el_code_container
//         , old_theme = code_container.data('theme')
//         , current_theme = store.get('current_theme')
//         if(store.get('themes').indexOf(current_theme) === -1){
//             // somehow an invalid theme got set, update with a valid one
//             store.set('current_theme', store.get('themese')[0])
//             current_theme = store.get('current_theme')
//         }

//         if(old_theme !== current_theme){
//             code_container.removeClass(old_theme)
//             code_container.data('theme', current_theme)
//             code_container.addClass(current_theme)
//         }
//     },
//     /**
//      * To make rendering efficient, only render the (potentially very large) source file when we need to.
//      * Otherwise just update breakpoints and line highlighting through DOM manipluation in "after_render"
//      * param reactor: reactor object (see stator.js) tied to DOM node
//      */
//     should_render: function(reactor){
//         void(reactor)
//         SourceCode.set_theme_in_dom()
//         let fullname = store.get('fullname_to_render')

//         if(fullname === undefined || store.get('missing_files').indexOf(fullname) !== -1){
//             // don't try to be super efficient when rendering disassembly. It's not that large, and the logic
//             // to determine this accurately is difficult.
//             return true
//         }

//         if(fullname === store.get('rendered_source_file_fullname')){
//             // we already rendered this file, but if we have new assembly, it should update
//             return store.get('has_unrendered_assembly')
//         }
//         // rendering a different source file, it should update
//         return true
//     },
//     render: function(reactor){
//         void(reactor)

//         let anon_file_source = store.get('disassembly_for_missing_file')
//         , addr = store.get('current_assembly_address')
//         , fullname = store.get('fullname_to_render')
//         , line_of_source_to_flash = parseInt(store.get('line_of_source_to_flash'))

//         if(fullname === null){
//             store.set('rendered_source_file_fullname', null)
//             store.set('line_of_source_to_flash', null)
//             return ''

//         }else if(!SourceCode.is_cached(store.get('fullname_to_render'))){
//             // if file is not missing or undefined, continue
//             let source_file_does_not_exist = fullname === undefined || store.get('missing_files').indexOf(fullname) !== -1
//             , assembly_is_cached_for_this_addr = anon_file_source.some(obj => obj.address === addr)
//             if(source_file_does_not_exist){
//                 if(!assembly_is_cached_for_this_addr){
//                     if(addr === undefined){
//                         store.set('line_of_source_to_flash', null)
//                         return 'stopped on unknown address'
//                     }
//                     store.set('line_of_source_to_flash', null)
//                     SourceCode.fetch_disassembly_for_missing_file(parseInt(addr))
//                     return 'fetching assembly'
//                 }
//             }else{
//                 // source file *might* exist. Try to fetch it. If it exists, this render function will be called again
//                 // and either the source will be displayed (if it exists), or the assembly will be fetched.
//                 let file_to_fetch = store.get('fullname_to_render')
//                 SourceCode.fetch_file(store.get('fullname_to_render'))
//                 store.set('rendered_source_file_fullname', null)
//                 return 'fetching file ' + file_to_fetch
//             }
//         }

//         let f = _.find(store.get('cached_source_files'), i => i.fullname === fullname)
//         let source_code
//         if(f){
//             source_code = f.source_code
//         }else{
//             let anon_file_source = store.get('disassembly_for_missing_file')
//             if(anon_file_source){
//                 source_code = anon_file_source.map(i => SourceCode._get_assembly_html(addr, i))
//             }else{
//                 // this shouldn't be possible
//                 return 'no source code, no assembly'
//             }
//         }

//         // make sure desired line is within number of lines of source code
//         if(line_of_source_to_flash > source_code.length){
//             SourceCode.el_jump_to_line_input.val(source_code.length)
//             store.set('line_of_source_to_flash', source_code.length)
//         }else if (line_of_source_to_flash < 0){
//             SourceCode.el_jump_to_line_input.val(0)
//             store.set('line_of_source_to_flash', 0)
//         }

//         SourceCode.show_modal_if_file_modified_after_binary(fullname)

//         let assembly = SourceCode.get_cached_assembly_for_file(fullname)
//             , line_num = 1
//             , tbody = []

//         for (let line of source_code){
//             let assembly_for_line = SourceCode.get_assembly_html_for_line(true, assembly, line_num, addr)

//             tbody.push(`
//                 <tr class='srccode'>
//                     <td valign="top" class='line_num' data-line=${line_num} style='width: 30px;'>
//                         <div>${line_num}</div>
//                     </td>

//                     <td valign="top" class='loc' data-line=${line_num}>
//                         <span class='wsp'>${line}</span>
//                     </td>

//                     ${assembly_for_line}
//                 </tr>
//                 `)
//             line_num++;
//         }

//         store.set('rendered_source_file_fullname', fullname)
//         store.set('make_current_line_visible', true)
//         return tbody.join('')
//     },
//     after_render: function(reactor){
//         void(reactor)
//         let fullname = store.get('fullname_to_render')
//         if(fullname && store.get('missing_files').indexOf(fullname) === -1){
//             SourceCode.render_breakpoints()
//             SourceCode.highlight_paused_line()
//             if(store.get('make_current_line_visible')){
//                 SourceCode.make_current_line_visible()
//             }
//         }
//         store.set('make_current_line_visible', false)
//         store.set('has_unrendered_assembly', false)
//     },
//     // re-render breakpoints on whichever file is loaded
//     render_breakpoints: function(){
//         document.querySelectorAll('.line_num.breakpoint').forEach(el => el.classList.remove('breakpoint'))
//         document.querySelectorAll('.line_num.disabled_breakpoint').forEach(el => el.classList.remove('disabled_breakpoint'))
//         if(_.isString(store.get('rendered_source_file_fullname'))){

//             let bkpt_lines = Breakpoint.get_breakpoint_lines_for_file(store.get('rendered_source_file_fullname'))
//             , disabled_breakpoint_lines = Breakpoint.get_disabled_breakpoint_lines_for_file(store.get('rendered_source_file_fullname'))

//             for(let bkpt_line of bkpt_lines){
//                 let js_line = $(`td.line_num[data-line=${bkpt_line}]`)[0]
//                 if(js_line){
//                     $(js_line).addClass('breakpoint')
//                 }
//             }

//             for(let bkpt_line of disabled_breakpoint_lines){
//                 let js_line = $(`td.line_num[data-line=${bkpt_line}]`)[0]
//                 if(js_line){
//                     $(js_line).addClass('disabled_breakpoint')
//                 }
//             }
//         }
//     },
//     /**
//      * Current line has an id in the DOM and a variable
//      * Remove the id and highlighting in the DOM, and set the
//      * variable to null
//      */
//     remove_line_highlights: function(){
//         $('#scroll_to_line').removeAttr('id')
//         document.querySelectorAll('.flash').forEach(el => el.classList.remove('flash'))
//         document.querySelectorAll('.current_assembly_command').forEach(el => el.classList.remove('current_assembly_command'))
//         document.querySelectorAll('.paused_on_line').forEach(el => el.classList.remove('paused_on_line'))
//     },
//     highlight_paused_line: function(){
//         SourceCode.remove_line_highlights()

//         let fullname = store.get('rendered_source_file_fullname')
//         , line_num = store.get('line_of_source_to_flash')
//         , addr = store.get('current_assembly_address')
//         , inferior_program_is_paused_in_this_file = _.isObject(store.get('paused_on_frame')) && store.get('paused_on_frame').fullname === fullname
//         , paused_on_current_line = (inferior_program_is_paused_in_this_file && parseInt(store.get('paused_on_frame').line) === parseInt(line_num))

//         // make background blue if gdb is paused on a line in this file
//         if(inferior_program_is_paused_in_this_file){
//             let jq_line = $(`.loc[data-line=${store.get('paused_on_frame').line}]`)
//             if(jq_line.length === 1){
//                 jq_line.offset()  // needed so DOM registers change and re-draws animation
//                 jq_line.addClass('paused_on_line')
//                 if(paused_on_current_line){
//                     jq_line.attr('id', 'scroll_to_line')
//                 }
//             }
//         }

//         // make this line flash ONLY if it's NOT the line we're paused on
//         if(line_num && !paused_on_current_line){
//             let jq_line = $(`.loc[data-line=${line_num}]`)
//             if(jq_line.length === 1){
//                 // https://css-tricks.com/restart-css-animation/
//                 jq_line.offset()  // needed so DOM registers change and re-draws animation
//                 jq_line.addClass('flash')
//                 jq_line.attr('id', 'scroll_to_line')
//             }
//         }

//         if(addr){
//             // find element with assembly class and data-addr as the desired address, and
//             // current_assembly_command class
//             let jq_assembly = $(`.assembly[data-addr=${addr}]`)
//             if(jq_assembly.length === 1){
//                 jq_assembly.addClass('current_assembly_command')
//             }
//         }
//     },

//     /**
//      * Something in DOM triggered this callback to view a file.
//      * The current target must have data embedded in it with:
//      * fullname: full path of source code file to view
//      * line (optional): line number to scroll to
//      * addr (optional): instruction address to highlight
//      */
//     click_view_file: function(e){
//         SourceCode.view_file(e.currentTarget.dataset['fullname'], parseInt(e.currentTarget.dataset['line']))
//     },
//     keydown_jump_to_line: function(e){
//         if (e.keyCode === constants.ENTER_BUTTON_NUM){
//             let line = parseInt(e.currentTarget.value)
//             store.set('line_of_source_to_flash', line)
//             store.set('make_current_line_visible', true)
//         }
//     },
//     get_attrs_to_view_file: function(fullname, line=0){
//         return `class='view_file pointer' data-fullname=${fullname} data-line=${line}`
//     },
// }

// void(SourceCode2)

export default SourceCode
