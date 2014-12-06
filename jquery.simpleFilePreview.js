/* Copyright (c) 2012 Jordan Kasper
 * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * Copyright notice and license must remain intact for legal use
 * Requires: jQuery 1.2+
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, 
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF 
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS 
 * BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN 
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN 
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * 
 * Fore more usage documentation and examples, visit:
 *          http://jordankasper.com/jquery
 * 
 * Basic usage (shown with defaults, except for "existingFiles"):
 *  
    <form ... enctype='multipart/form-data'>
      ...
      <input type='file' name='upload' id='upload' multiple="multiple" />
      ...
    </form>
    
    var files = {"file_id": "file_name", ...};
    $('input[type=file]').simpleFilePreview({
      'buttonContent': 'Add File',             // String HTML content for the button to add a new file
      'removeContent': 'X',                    // String HTML content for the removal icon shown on hover when a file is selected (or for existing files)
      'existingFiles': files,                  // array | object If an object, key is used in the remove hidden input (defaults to null)
      'shiftLeft': '&lt;&lt;',                 // String HTML content for the button to shift left for multiple file inputs
      'shiftRight': '&gt;&gt;',                // String HTML content for the button to shift right for multiple file inputs
      'iconPath': '',                          // String The path to the folder containing icon images (when a preview is unavailable) - should be absolute, but if relative, must be relative to the page the file input is on
      'defaultIcon': 'preview_file.png',       // String The file name to use for the defualt preview icon (when a proper file-type-specific icon cannot be found)
      'icons': {'png': 'preview_png.png', ...} // Object A mapping of file type (second half of mime type) to icon image file (used in combination with the "iconPath" option)
    });
 * 
 * TODO:
 *   - add events for binding to various actions
 *   - add example of html produced
 * 
 * REVISIONS:
 *   0.1 Initial release
 *   
 */
;(function($) {
  
  $.fn.simpleFilePreview = function(o) {
    var n = this;
    if (!n || !n.length) { return n; }
    
    // Set up options (and defaults)
    o = (o)?o:{};
    o = $.extend({}, $.simpleFilePreview.defaults, o);
    
    n.each(function() {
      setup($(this), o);
    });
    
    // set up global events
    if (!$.simpleFilePreview.init) {
      $.simpleFilePreview.init = true;
      $('body')
        
        // open file browser dialog on click of styled "button"
        .on('click', '.simpleFilePreview_input', function(e) {
          $(this).parents('.simpleFilePreview').find('input.simpleFilePreview_formInput').trigger('click');
          e.preventDefault();
          return false;
        })
        
        // on click of the actual input (which is invisible), check to see if 
        // we need to clear the input (which is the default action for this plugin)
        .on('click', '.simpleFilePreview input.simpleFilePreview_formInput', function(e) {
          if ($(this).val().length) {
            e.preventDefault();
            $(this).parents('.simpleFilePreview').find('.simpleFilePreview_preview').click();
            return false;
          }
        })
        
        // when file input changes, get file contents and show preview (if it's an image)
        .on('change', '.simpleFilePreview input.simpleFilePreview_formInput', function(e) {
          var p = $(this).parents('.simpleFilePreview');
          
          // if it's a multi-select, add another selection box to the end
          // NOTE: this is done first since we clone the previous input
          // NOTE: the second check is there because IE 8 fires multiple change events for no good reason
          if (p.attr('data-sfpallowmultiple') == 1 && !p.find('.simpleFilePreview_preview').length) {
            var newId = $.simpleFilePreview.uid++;
            var newN = p.clone(true).attr('id', "simpleFilePreview_"+newId);
            newN.find('input.simpleFilePreview_formInput').attr('id', newN.find('input.simpleFilePreview_formInput').attr('id')+'_'+newId).val('');
            p.after(newN);
            var nw = p.parents('.simpleFilePreview_multi').width('+='+newN.outerWidth(true)).width();
            if (nw > p.parents('.simpleFilePreview_multiClip').width()) {
              p.parents('.simpleFilePreview_multiUI')
               .find('.simpleFilePreview_shiftRight')
               .click();
            }
          }
          
          if (this.files && this.files[0]) {
            if ((new RegExp("^image\/("+$.simpleFilePreview.previewFileTypes+")$")).test(this.files[0].type.toLowerCase())) {
              
              if (window.FileReader) {
                if ((new RegExp("^image\/("+$.simpleFilePreview.previewFileTypes+")$")).test(this.files[0].type.toLowerCase())) {
                  // show preview of image file
                  var r = new FileReader();
                  r.onload = function (e) {
                    addOrChangePreview(p, e.target.result);
                  };
                  r.readAsDataURL(this.files[0]);
                  
                }
              }
              
            } else {
              // show icon if not an image upload
              var m = this.files[0].type.toLowerCase().match(/^\s*[^\/]+\/([a-zA-Z0-9\-\.]+)\s*$/);
              if (m && m[1] && o.icons[m[1]]) {
                addOrChangePreview(p, o.iconPath+o.icons[m[1]], getFilename(this.value));
              } else {
                addOrChangePreview(p, o.iconPath+o.defaultIcon, getFilename(this.value));
              }
            }
            
          } else {
            // Any browser not supporting the File API (and FileReader)
            
            // Some versions of IE don't have real paths, and can't support
            // any other way to do file preview without uploading to the server
            // If a browser does report a valid path (IE or otherwise), then 
            // we'll try to get the file preview
            
            var e = getFileExt(this.value);
            e = (e)?e.toLowerCase():null;
            if (e && !(/fakepath/.test(this.value.toLowerCase())) && (new RegExp("^("+$.simpleFilePreview.previewFileTypes+")$")).test(e)) {
              // older versions of IE (and some other browsers) report the local 
              // file path, so try to get a preview that way
              addOrChangePreview(p, "file://"+this.value);
              
            } else {
              // not an image (or using fakepath), so no preview anyway
              if (o.icons[e]) {
                addOrChangePreview(p, o.iconPath+o.icons[e], getFilename(this.value));
              } else {
                addOrChangePreview(p, o.iconPath+o.defaultIcon, getFilename(this.value));
              }
            }
          }
        })
        
        // show or hide "remove" icon for file preview/icon
        .on('mouseover', '.simpleFilePreview_preview, .simpleFilePreview input.simpleFilePreview_formInput', function() {
          var p = $(this).parents('.simpleFilePreview');
          if (p.find('.simpleFilePreview_preview').is(':visible')) {
            p.find('.simpleFilePreview_remove').show();
          }
        })
        .on('mouseout', '.simpleFilePreview_preview, .simpleFilePreview input.simpleFilePreview_formInput', function() {
          $(this).parents('.simpleFilePreview').find('.simpleFilePreview_remove').hide();
        })
        
        // remove file when preview/icon is clicked
        .on('click', '.simpleFilePreview_preview', function() {
          var p = $(this).parents('.simpleFilePreview');
          
          if (p.attr('data-sfpallowmultiple') == 1 && p.siblings('.simpleFilePreview').length) {
            if (p.hasClass('simpleFilePreview_existing')) {
              p.parent().append("<input type='hidden' id='"+p.attr('id')+"_remove' name='removeFiles[]' value='"+p.attr('data-sfprid')+"' />");
            }
            
            p.parents('.simpleFilePreview_multi').width('-='+p.width());
            p.remove();
            
          } else {
            // if it was an existing file, show file input and add "removeFiles" hidden input
            if (p.hasClass('simpleFilePreview_existing')) {
              p.find('input.simpleFilePreview_formInput').show();
              p.append("<input type='hidden' id='"+p.attr('id')+"_remove' name='removeFiles[]' value='"+p.attr('data-sfprid')+"' />");
              p.removeClass('simpleFilePreview_existing'); // no longer needed
            }
            
            // kill value in the input
            var i = p.find('input.simpleFilePreview_formInput').val('');
            
            // Some browsers (*cough*IE*cough*) do not allow us to set val() 
            // on a file input, so we have to clone it without the value
            if (i && i.length && i.val().length) {
              var attr = i.get(0).attributes;
              var a = "";
              for (var j=0, l=attr.length; j<l; ++j) {
                if (attr[j].name != 'value' && attr[j].name != 'title') {
                  a += attr[j].name+"='"+i.attr(attr[j].name)+"' ";
                }
              }
              var ni = $("<input "+a+" />");
              i.before(ni);
              i.remove();
            }
            
            // remove the preview element
            $(this).remove();
            p.find('.simpleFilePreview_filename').remove();
            // show styled input "button"
            p.find('.simpleFilePreview_remove').hide().end()
             .find('.simpleFilePreview_input').show();
          }
        })
        
        // shift buttons for multi-selects
        .on('click', '.simpleFilePreview_shiftRight', function() {
          var ul = $(this).parents('.simpleFilePreview_multiUI').find('.simpleFilePreview_multi');
          var r = parseInt(ul.css('left')) + ul.width();
          if (r > ul.parent().width()) {
            var li = ul.find('li:first');
            ul.animate({'left': '-='+li.outerWidth(true)});
          }
        })
        .on('click', '.simpleFilePreview_shiftLeft', function() {
          var ul = $(this).parents('.simpleFilePreview_multiUI').find('.simpleFilePreview_multi');
          var l = parseInt(ul.css('left'));
          if (l < 0) {
            var w = ul.find('li:first').outerWidth(true);
            ul.animate({'left': ((l+w)<1)?'+='+w:0});
          }
        });
    }
    
    // return node for fluid chain calling
    return n;
  };
  
  var setup = function(n, o) {
    var isMulti = n.is('[multiple]');
    // "multiple" removed because it's handled later manually
    n = n.removeAttr('multiple').addClass('simpleFilePreview_formInput');
    
    // wrap input with necessary structure
    var c = $("<"+((isMulti)?'li':'div')+" id='simpleFilePreview_"+($.simpleFilePreview.uid++)+"' class='simpleFilePreview' data-sfpallowmultiple='"+((isMulti)?1:0)+"'>" +
              "<a class='simpleFilePreview_input'><span class='simpleFilePreview_inputButtonText'>"+o.buttonContent+"</span></a>" +
              "<span class='simpleFilePreview_remove'>"+o.removeContent+"</span>"+
              "</"+((isMulti)?'li':'div')+">");
    n.before(c);
    c.append(n);
    // mostly for IE, the file input must be sized the same as the container, 
    // opacity 0, and z-indexed above other elements within the preview container
    n.css({
      width: c.width()+'px',
      height: c.height()+'px'
    });
    
    // if it's a multi-select we use multiple separate inputs instead to support file preview
    if (isMulti) {
      c.wrap("<div class='simpleFilePreview_multiUI'><div class='simpleFilePreview_multiClip'><ul class='simpleFilePreview_multi'></ul></div></div>");
      c.parents('.simpleFilePreview_multiUI')
        .prepend("<span class='simpleFilePreview_shiftRight simpleFilePreview_shifter'>"+o.shiftRight+"</span>")
        .append("<span class='simpleFilePreview_shiftLeft simpleFilePreview_shifter'>"+o.shiftLeft+"</span>");
    }
    
    var ex = o.existingFiles;
    if (ex) {
      if (isMulti) {
        // add all of the existing files to preview block
        var arr = ($.isArray(ex))?1:0;
        for (var i in ex) {
          var ni = $.simpleFilePreview.uid++;
          var nn = c.clone(true).attr('id', "simpleFilePreview_"+ni);
          nn.addClass('simpleFilePreview_existing')
            .attr('data-sfprid', (arr)?ex[i]:i)
            .find('input.simpleFilePreview_formInput').remove();
          c.before(nn);
          
          var e = getFileExt(ex[i]);
          e = (e)?e.toLowerCase():null;
          if (e && (new RegExp("^("+$.simpleFilePreview.previewFileTypes+")$")).test(e)) {
            addOrChangePreview(nn, ex[i]);
          } else if (o.icons[e]) {
            addOrChangePreview(nn, o.iconPath+o.icons[e], getFilename(ex[i]));
          } else {
            addOrChangePreview(nn, o.iconPath+o.defaultIcon, getFilename(ex[i]));
          }
        }
        
      } else {
        // for single inputs we only take the last file
        var f = null;
        var arr = ($.isArray(ex))?1:0;
        for (var i in ex) {
          f = {id: (arr)?ex[i]:i, file: ex[i]};
        }
        if (f) {
          // hide file input, will be shown if existing file is removed
          c.attr('data-sfprid', f['id'])
           .addClass('simpleFilePreview_existing')
           .find('input.simpleFilePreview_formInput').hide();
          
          var e = getFileExt(f['file']);
          e = (e)?e.toLowerCase():null;
          if (e && (new RegExp("^("+$.simpleFilePreview.previewFileTypes+")$")).test(e)) {
            addOrChangePreview(c, f['file']);
          } else if (o.icons[e]) {
            addOrChangePreview(c, o.iconPath+o.icons[e], getFilename(f['file']));
          } else {
            addOrChangePreview(c, o.iconPath+o.defaultIcon, getFilename(f['file']));
          }
        }
      }
    }
    
    if (isMulti) {
      $('.simpleFilePreview_multi').width(c.outerWidth(true) * c.parent().find('.simpleFilePreview').length);
    }
    
  };
  
  var addOrChangePreview = function(p, src, fn) {
    fn = (fn)?(""+fn):null;
    
    p.find('.simpleFilePreview_input').hide();
    var i = p.find('.simpleFilePreview_preview');
    if (i && i.length) {
      i.attr('src', src);
    } else {
      p.append("<img src='"+src+"' class='simpleFilePreview_preview "+((fn)?'simpleFilePreview_hasFilename':'')+"' alt='"+((fn)?fn:'File Preview')+"' title='Remove "+((fn)?fn:'this file')+"' />");
      // for tooltips
      p.find('input.simpleFilePreview_formInput').attr('title', "Remove "+((fn)?fn:'this file'));
    }
    
    if (fn) {
      var f = p.find('.simpleFilePreview_filename');
      if (f && f.length) {
        f.text(fn);
      } else {
        f = p.append("<span class='simpleFilePreview_filename'>"+fn+"</span>")
             .find('.simpleFilePreview_filename');
      }
    }
  };
  
  var getFilename = function(p) {
    var m = p.match(/[\/\\]([^\/\\]+)$/);
    if (m && m[1] && m[1].length) {
      return m[1];
    }
    return null;
  };
  
  var getFileExt = function(p) {
    var m = p.match(/[\.]([^\/\\\.]+)$/);
    if (m && m[1] && m[1].length) {
      return m[1];
    }
    return null;
  };
  
  // Static properties
  $.simpleFilePreview = {
    defaults: {
      'buttonContent': 'Add File',
      'removeContent': 'X',
      'existingFiles': null, // array or object. if object, key is used in the remove hidden input
      'shiftLeft': '&lt;&lt;',
      'shiftRight': '&gt;&gt;',
      'iconPath': '',
      'defaultIcon': 'preview_file.png',
      'icons': {
        'png': 'preview_png.png',
        'gif': 'preview_png.png',
        'bmp': 'preview_png.png',
        'svg': 'preview_png.png',
        'jpg': 'preview_png.png',
        'jpeg': 'preview_png.png',
        'pjpg': 'preview_png.png',
        'pjpeg': 'preview_png.png',
        'tif': 'preview_png.png',
        'tiff': 'preview_png.png',
        'mp3': 'preview_mp3.png',
        'mp4': 'preview_mp3.png',
        'wav': 'preview_mp3.png',
        'wma': 'preview_mp3.png',
        'pdf': 'preview_pdf.png',
        'txt': 'preview_txt.png',
        'rtf': 'preview_txt.png',
        'text': 'preview_txt.png',
        'plain': 'preview_txt.png',
        'zip': 'preview_zip.png',
        'tgz': 'preview_zip.png',
        'x-rar-compressed': 'preview_zip.png',
        'octet-stream': 'preview_zip.png',
        'odf': 'preview_doc.png',
        'odt': 'preview_doc.png',
        'doc': 'preview_doc.png',
        'msword': 'preview_doc.png',
        'vnd.openxmlformats-officedocument.wordprocessingml.document': 'preview_doc.png',
        'doc': 'preview_doc.png',
        'docx': 'preview_doc.png',
        'ods': 'preview_xls.png',
        'vnd.ms-excel': 'preview_xls.png',
        'xls': 'preview_xls.png',
        'xlx': 'preview_xls.png',
        'msexcel': 'preview_xls.png',
        'x-excel': 'preview_xls.png',
        'x-ms-excel': 'preview_xls.png',
        'vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'preview_xls.png'
      }
    },
    uid: 0,
    init: false,
    previewFileTypes: 'p?jpe?g|png|gif|bmp|svg'
  };
  
})(jQuery);
