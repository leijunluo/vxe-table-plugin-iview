import XEUtils from 'xe-utils'

function getFormatDate (value, props, defaultFormat) {
  return XEUtils.toDateString(value, props.format || defaultFormat)
}

function getFormatDates (values, props, separator, defaultFormat) {
  return XEUtils.map(values, function (date) {
    return getFormatDate(date, props, defaultFormat)
  }).join(separator)
}

function matchCascaderData (index, list, values, labels) {
  let val = values[index]
  if (list && values.length > index) {
    XEUtils.each(list, function (item) {
      if (item.value === val) {
        labels.push(item.label)
        matchCascaderData(++index, item.children, values, labels)
      }
    })
  }
}

function getEvents (editRender, params) {
  let { events } = editRender
  let { $table } = params
  let type = 'on-change'
  let on = {
    [type]: () => $table.updateStatus(params)
  }
  if (events) {
    Object.assign(on, XEUtils.objectMap(events, cb => function () {
      cb.apply(null, [params].concat.apply(params, arguments))
    }))
  }
  return on
}

function defaultRender (h, editRender, params) {
  let { $table, row, column } = params
  let { props } = editRender
  if ($table.size) {
    props = Object.assign({ size: $table.size }, props)
  }
  return [
    h(editRender.name, {
      props,
      model: {
        value: XEUtils.get(row, column.property),
        callback (value) {
          XEUtils.set(row, column.property, value)
        }
      },
      on: getEvents(editRender, params)
    })
  ]
}

function cellText (h, cellValue) {
  return ['' + (cellValue === null || cellValue === void 0 ? '' : cellValue)]
}

const renderMap = {
  Input: {
    autofocus: 'input.ivu-input',
    renderEdit: defaultRender
  },
  InputNumber: {
    autofocus: 'input.ivu-input-number-input',
    renderEdit: defaultRender
  },
  Select: {
    renderEdit (h, editRender, params) {
      let { options, optionGroups, props = {}, optionProps = {}, optionGroupProps = {} } = editRender
      let { $table, row, column } = params
      let labelProp = optionProps.label || 'label'
      let valueProp = optionProps.value || 'value'
      if ($table.size) {
        props = XEUtils.assign({ size: $table.size }, props)
      }
      if (optionGroups) {
        let groupOptions = optionGroupProps.options || 'options'
        let groupLabel = optionGroupProps.label || 'label'
        return [
          h('Select', {
            props,
            model: {
              value: XEUtils.get(row, column.property),
              callback (cellValue) {
                XEUtils.set(row, column.property, cellValue)
              }
            },
            on: getEvents(editRender, params)
          }, XEUtils.map(optionGroups, function (group, gIndex) {
            return h('OptionGroup', {
              props: {
                label: group[groupLabel]
              },
              key: gIndex
            }, XEUtils.map(group[groupOptions], function (item, index) {
              return h('Option', {
                props: {
                  value: item[valueProp],
                  label: item[labelProp]
                },
                key: index
              })
            }))
          }))
        ]
      }
      return [
        h('Select', {
          props,
          model: {
            value: XEUtils.get(row, column.property),
            callback (cellValue) {
              XEUtils.set(row, column.property, cellValue)
            }
          },
          on: getEvents(editRender, params)
        }, XEUtils.map(options, function (item, index) {
          return h('Option', {
            props: {
              value: item[valueProp],
              label: item[labelProp]
            },
            key: index
          })
        }))
      ]
    },
    renderCell (h, editRender, params) {
      let { options, optionGroups, props = {}, optionProps = {}, optionGroupProps = {} } = editRender
      let { row, column } = params
      let labelProp = optionProps.label || 'label'
      let valueProp = optionProps.value || 'value'
      let groupOptions = optionGroupProps.options || 'options'
      let cellValue = XEUtils.get(row, column.property)
      if (!(cellValue === null || cellValue === undefined || cellValue === '')) {
        return cellText(h, XEUtils.map(props.multiple ? cellValue : [cellValue], optionGroups ? value => {
          let selectItem
          for (let index = 0; index < optionGroups.length; index++) {
            selectItem = XEUtils.find(optionGroups[index][groupOptions], item => item[valueProp] === value)
            if (selectItem) {
              break
            }
          }
          return selectItem ? selectItem[labelProp] : null
        } : value => {
          let selectItem = XEUtils.find(options, item => item[valueProp] === value)
          return selectItem ? selectItem[labelProp] : null
        }).join(';'))
      }
      return cellText(h, '')
    }
  },
  Cascader: {
    renderEdit: defaultRender,
    renderCell (h, { props = {} }, params) {
      let { row, column } = params
      let cellValue = XEUtils.get(row, column.property)
      var values = cellValue || []
      var labels = []
      matchCascaderData(0, props.data, values, labels)
      return cellText(h, labels.join(` ${props.separator || '/'} `))
    }
  },
  DatePicker: {
    renderEdit: defaultRender,
    renderCell (h, { props = {} }, params) {
      let { row, column } = params
      let { separator } = props
      let cellValue = XEUtils.get(row, column.property)
      switch (props.type) {
        case 'week':
          cellValue = getFormatDate(cellValue, props, 'yyyywWW')
          break
        case 'month':
          cellValue = getFormatDate(cellValue, props, 'yyyy-MM')
          break
        case 'year':
          cellValue = getFormatDate(cellValue, props, 'yyyy')
          break
        case 'dates':
          cellValue = getFormatDates(cellValue, props, ', ', 'yyyy-MM-dd')
          break
        case 'daterange':
          cellValue = getFormatDates(cellValue, props, ` ${separator || '-'} `, 'yyyy-MM-dd')
          break
        case 'datetimerange':
          cellValue = getFormatDates(cellValue, props, ` ${separator || '-'} `, 'yyyy-MM-dd HH:ss:mm')
          break
        default:
          cellValue = getFormatDate(cellValue, props, 'yyyy-MM-dd')
          break
      }
      return cellText(h, cellValue)
    }
  },
  TimePicker: {
    renderEdit: defaultRender
  },
  Rate: {
    renderEdit: defaultRender
  },
  iSwitch: {
    renderEdit: defaultRender
  }
}

function hasClass (elem, cls) {
  return elem && elem.className && elem.className.split && elem.className.split(' ').indexOf(cls) > -1
}

/**
 * 检查触发源是否属于目标节点
 */
function getEventTargetNode (evnt, container, queryCls) {
  let targetElem
  let target = evnt.target
  while (target && target.nodeType && target !== document) {
    if (queryCls && hasClass(target, queryCls)) {
      targetElem = target
    } else if (target === container) {
      return { flag: queryCls ? !!targetElem : true, container, targetElem: targetElem }
    }
    target = target.parentNode
  }
  return { flag: false }
}

function clearActivedEvent (params, evnt) {
  if (
    // 下拉框、日期
    getEventTargetNode(evnt, document.body, 'ivu-select-dropdown').flag
  ) {
    return false
  }
}

function VXETablePluginIView () {}

VXETablePluginIView.install = function (GlobalConfig, EventInterceptor) {
  Object.assign(GlobalConfig.renderMap, renderMap)
  if (EventInterceptor.clearActiveds.indexOf(clearActivedEvent) === -1) {
    EventInterceptor.clearActiveds.push(clearActivedEvent)
  }
}

if (typeof window !== 'undefined' && window.VXETable) {
  window.VXETable.use(VXETablePluginIView)
}

export default VXETablePluginIView
