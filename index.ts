/* eslint-disable no-unused-vars */
import { CreateElement } from 'vue'
import XEUtils from 'xe-utils'
import {
  VXETable,
  RenderParams,
  OptionProps,
  InterceptorParams,
  TableRenderParams,
  RenderOptions,
  ColumnFilterParams,
  ColumnFilterRenderOptions,
  ColumnCellRenderOptions,
  ColumnEditRenderOptions,
  ColumnCellRenderParams,
  ColumnEditRenderParams,
  ColumnFilterRenderParams,
  ColumnFilterMethodParams,
  FormItemRenderParams,
  FormItemRenderOptions,
  ColumnExportCellRenderParams
} from 'vxe-table'
/* eslint-enable no-unused-vars */

function isEmptyValue (cellValue: any) {
  return cellValue === null || cellValue === undefined || cellValue === ''
}

function getModelProp (renderOpts: RenderOptions) {
  return 'value'
}

function getModelEvent (renderOpts: RenderOptions) {
  return 'input'
}

function getChangeEvent (renderOpts: RenderOptions) {
  return 'on-change'
}

function getFormatDate (value: any, props: { [key: string]: any }, defaultFormat: string) {
  return XEUtils.toDateString(value, props.format || defaultFormat)
}

function getFormatDates (values: any, props: { [key: string]: any }, separator: string, defaultFormat: string) {
  return XEUtils.map(values, (date: any) => getFormatDate(date, props, defaultFormat)).join(separator)
}

function equalDaterange (cellValue: any, data: any, props: { [key: string]: any }, defaultFormat: string) {
  cellValue = getFormatDate(cellValue, props, defaultFormat)
  return cellValue >= getFormatDate(data[0], props, defaultFormat) && cellValue <= getFormatDate(data[1], props, defaultFormat)
}

function getCellEditFilterProps (renderOpts: RenderOptions, params: TableRenderParams, value: any, defaultProps?: { [prop: string]: any }) {
  const { vSize } = params.$table
  return XEUtils.assign(vSize ? { size: vSize } : {}, defaultProps, renderOpts.props, { [getModelProp(renderOpts)]: value })
}

function getItemProps (renderOpts: RenderOptions, params: FormItemRenderParams, value: any, defaultProps?: { [prop: string]: any }) {
  const { vSize } = params.$form
  return XEUtils.assign(vSize ? { size: vSize } : {}, defaultProps, renderOpts.props, { [getModelProp(renderOpts)]: value })
}

function getNativeOns (renderOpts: RenderOptions, params: RenderParams) {
  const { nativeEvents } = renderOpts
  const nativeOns: { [type: string]: Function } = {}
  XEUtils.objectEach(nativeEvents, (func: Function, key: string) => {
    nativeOns[key] = function (...args: any[]) {
      func(params, ...args)
    }
  })
  return nativeOns
}

function getOns (renderOpts: RenderOptions, params: RenderParams, inputFunc?: Function, changeFunc?: Function) {
  const { events } = renderOpts
  const modelEvent = getModelEvent(renderOpts)
  const changeEvent = getChangeEvent(renderOpts)
  const isSameEvent = changeEvent === modelEvent
  const ons: { [type: string]: Function } = {}
  XEUtils.objectEach(events, (func: Function, key: string) => {
    ons[key] = function (...args: any[]) {
      func(params, ...args)
    }
  })
  if (inputFunc) {
    ons[modelEvent] = function (targetEvnt: any) {
      inputFunc(targetEvnt)
      if (events && events[modelEvent]) {
        events[modelEvent](params, targetEvnt)
      }
      if (isSameEvent && changeFunc) {
        changeFunc(targetEvnt)
      }
    }
  }
  if (!isSameEvent && changeFunc) {
    ons[changeEvent] = function (...args: any[]) {
      changeFunc(...args)
      if (events && events[changeEvent]) {
        events[changeEvent](params, ...args)
      }
    }
  }
  return ons
}

function getEditOns (renderOpts: RenderOptions, params: ColumnEditRenderParams) {
  const { $table, row, column } = params
  return getOns(renderOpts, params, (value: any) => {
    // 处理 model 值双向绑定
    XEUtils.set(row, column.property, value)
  }, () => {
    // 处理 change 事件相关逻辑
    $table.updateStatus(params)
  })
}

function getFilterOns (renderOpts: RenderOptions, params: ColumnFilterRenderParams, option: ColumnFilterParams, changeFunc: Function) {
  return getOns(renderOpts, params, (value: any) => {
    // 处理 model 值双向绑定
    option.data = value
  }, changeFunc)
}

function getItemOns (renderOpts: RenderOptions, params: FormItemRenderParams) {
  const { $form, data, property } = params
  return getOns(renderOpts, params, (value: any) => {
    // 处理 model 值双向绑定
    XEUtils.set(data, property, value)
  }, () => {
    // 处理 change 事件相关逻辑
    $form.updateStatus(params)
  })
}

function matchCascaderData (index: number, list: any[], values: any[], labels: any[]) {
  const val = values[index]
  if (list && values.length > index) {
    XEUtils.each(list, (item) => {
      if (item.value === val) {
        labels.push(item.label)
        matchCascaderData(++index, item.children, values, labels)
      }
    })
  }
}

function getSelectCellValue (renderOpts: ColumnCellRenderOptions, params: ColumnCellRenderParams) {
  const { options = [], optionGroups, props = {}, optionProps = {}, optionGroupProps = {} } = renderOpts
  const { row, column } = params
  const $table: any = params.$table
  const labelProp = optionProps.label || 'label'
  const valueProp = optionProps.value || 'value'
  const groupOptions = optionGroupProps.options || 'options'
  const cellValue = XEUtils.get(row, column.property)
  const colid = column.id
  let rest: any
  let cellData: any
  if (props.filterable) {
    const fullAllDataRowMap: Map<any, any> = $table.fullAllDataRowMap
    const cacheCell = fullAllDataRowMap.has(row)
    if (cacheCell) {
      rest = fullAllDataRowMap.get(row)
      cellData = rest.cellData
      if (!cellData) {
        cellData = fullAllDataRowMap.get(row).cellData = {}
      }
    }
    if (rest && cellData[colid] && cellData[colid].value === cellValue) {
      return cellData[colid].label
    }
  }
  if (!isEmptyValue(cellValue)) {
    return XEUtils.map(props.multiple ? cellValue : [cellValue], optionGroups ? (value) => {
      let selectItem
      for (let index = 0; index < optionGroups.length; index++) {
        selectItem = XEUtils.find(optionGroups[index][groupOptions], (item) => item[valueProp] === value)
        if (selectItem) {
          break
        }
      }
      const cellLabel: any = selectItem ? selectItem[labelProp] : value
      if (cellData && options && options.length) {
        cellData[colid] = { value: cellValue, label: cellLabel }
      }
      return cellLabel
    } : (value) => {
      const selectItem = XEUtils.find(options, (item) => item[valueProp] === value)
      const cellLabel: any = selectItem ? selectItem[labelProp] : value
      if (cellData && options && options.length) {
        cellData[colid] = { value: cellValue, label: cellLabel }
      }
      return cellLabel
    }).join(', ')
  }
  return null
}

function getCascaderCellValue (renderOpts: RenderOptions, params: ColumnCellRenderParams) {
  const { props = {} } = renderOpts
  const { row, column } = params
  const cellValue = XEUtils.get(row, column.property)
  const values: any[] = cellValue || []
  const labels: any[] = []
  matchCascaderData(0, props.data, values, labels)
  return labels.join(` ${props.separator || '/'} `)
}

function getDatePickerCellValue (renderOpts: RenderOptions, params: ColumnCellRenderParams) {
  const { props = {} } = renderOpts
  const { row, column } = params
  const { separator } = props
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
  return cellValue
}

function createEditRender (defaultProps?: { [key: string]: any }) {
  return function (h: CreateElement, renderOpts: ColumnEditRenderOptions, params: ColumnEditRenderParams) {
    const { row, column } = params
    const { attrs } = renderOpts
    const cellValue = XEUtils.get(row, column.property)
    return [
      h(renderOpts.name, {
        attrs,
        props: getCellEditFilterProps(renderOpts, params, cellValue, defaultProps),
        on: getEditOns(renderOpts, params),
        nativeOn: getNativeOns(renderOpts, params)
      })
    ]
  }
}

function defaultButtonEditRender (h: CreateElement, renderOpts: ColumnEditRenderOptions, params: ColumnEditRenderParams) {
  const { attrs } = renderOpts
  return [
    h('Button', {
      attrs,
      props: getCellEditFilterProps(renderOpts, params, null),
      on: getOns(renderOpts, params),
      nativeOn: getNativeOns(renderOpts, params)
    }, cellText(h, renderOpts.content))
  ]
}

function defaultButtonsEditRender (h: CreateElement, renderOpts: ColumnEditRenderOptions, params: ColumnEditRenderParams) {
  return renderOpts.children.map((childRenderOpts: ColumnEditRenderOptions) => defaultButtonEditRender(h, childRenderOpts, params)[0])
}

function createFilterRender (defaultProps?: { [key: string]: any }) {
  return function (h: CreateElement, renderOpts: ColumnFilterRenderOptions, params: ColumnFilterRenderParams) {
    const { column } = params
    const { name, attrs } = renderOpts
    const nativeOn = getNativeOns(renderOpts, params)
    return [
      h('div', {
        class: 'vxe-table--filter-iview-wrapper'
      }, column.filters.map((option, oIndex) => {
        const optionValue = option.data
        return h(name, {
          key: oIndex,
          attrs,
          props: getCellEditFilterProps(renderOpts, params, optionValue, defaultProps),
          on: getFilterOns(renderOpts, params, option, () => {
            // 处理 change 事件相关逻辑
            handleConfirmFilter(params, !!option.data, option)
          }),
          nativeOn
        })
      }))
    ]
  }
}

function handleConfirmFilter (params: ColumnFilterRenderParams, checked: boolean, option: ColumnFilterParams) {
  const { $panel } = params
  $panel.changeOption({}, checked, option)
}

function defaultFilterMethod (params: ColumnFilterMethodParams) {
  const { option, row, column } = params
  const { data } = option
  const cellValue = XEUtils.get(row, column.property)
  /* eslint-disable eqeqeq */
  return cellValue === data
}

function renderOptions (h: CreateElement, options: any[], optionProps: OptionProps) {
  const labelProp = optionProps.label || 'label'
  const valueProp = optionProps.value || 'value'
  return XEUtils.map(options, (item, oIndex) => {
    return h('Option', {
      key: oIndex,
      props: {
        value: item[valueProp],
        label: item[labelProp],
        disabled: item.disabled
      }
    })
  })
}

function cellText (h: CreateElement, cellValue: any) {
  return ['' + (isEmptyValue(cellValue) ? '' : cellValue)]
}

function createFormItemRender (defaultProps?: { [key: string]: any }) {
  return function (h: CreateElement, renderOpts: FormItemRenderOptions, params: FormItemRenderParams) {
    const { data, property } = params
    const { name } = renderOpts
    const { attrs } = renderOpts
    const itemValue = XEUtils.get(data, property)
    return [
      h(name, {
        attrs,
        props: getItemProps(renderOpts, params, itemValue, defaultProps),
        on: getItemOns(renderOpts, params),
        nativeOn: getNativeOns(renderOpts, params)
      })
    ]
  }
}

function defaultButtonItemRender (h: CreateElement, renderOpts: FormItemRenderOptions, params: FormItemRenderParams) {
  const { attrs } = renderOpts
  const props = getItemProps(renderOpts, params, null)
  return [
    h('Button', {
      attrs,
      props,
      on: getOns(renderOpts, params),
      nativeOn: getNativeOns(renderOpts, params)
    }, cellText(h, renderOpts.content || props.content))
  ]
}

function defaultButtonsItemRender (h: CreateElement, renderOpts: FormItemRenderOptions, params: FormItemRenderParams) {
  return renderOpts.children.map((childRenderOpts: FormItemRenderOptions) => defaultButtonItemRender(h, childRenderOpts, params)[0])
}

function createExportMethod (getExportCellValue: Function) {
  return function (params: ColumnExportCellRenderParams) {
    const { row, column, options } = params
    return options && options.original ? XEUtils.get(row, column.property) : getExportCellValue(column.editRender || column.cellRender, params)
  }
}

function createFormItemRadioAndCheckboxRender () {
  return function (h: CreateElement, renderOpts: FormItemRenderOptions, params: FormItemRenderParams) {
    const { name, options = [], optionProps = {} } = renderOpts
    const { data, property } = params
    const { attrs } = renderOpts
    const labelProp = optionProps.label || 'label'
    const valueProp = optionProps.value || 'value'
    const itemValue = XEUtils.get(data, property)
    return [
      h(`${name}Group`, {
        attrs,
        props: getItemProps(renderOpts, params, itemValue),
        on: getItemOns(renderOpts, params),
        nativeOn: getNativeOns(renderOpts, params)
      }, options.map((option) => {
        return h(name, {
          props: {
            label: option[valueProp],
            disabled: option.disabled
          }
        }, option[labelProp])
      }))
    ]
  }
}

/**
 * 渲染函数
 */
const renderMap = {
  Input: {
    autofocus: 'input.ivu-input',
    renderDefault: createEditRender(),
    renderEdit: createEditRender(),
    renderFilter: createFilterRender(),
    filterMethod: defaultFilterMethod,
    renderItem: createFormItemRender(),
    renderItemContent: createFormItemRender()
  },
  AutoComplete: {
    autofocus: 'input.ivu-input',
    renderDefault: createEditRender(),
    renderEdit: createEditRender(),
    renderFilter: createFilterRender(),
    filterMethod: defaultFilterMethod,
    renderItem: createFormItemRender(),
    renderItemContent: createFormItemRender()
  },
  InputNumber: {
    autofocus: 'input.ivu-input-number-input',
    renderDefault: createEditRender(),
    renderEdit: createEditRender(),
    renderFilter: createFilterRender(),
    filterMethod: defaultFilterMethod,
    renderItem: createFormItemRender(),
    renderItemContent: createFormItemRender()
  },
  Select: {
    renderEdit (h: CreateElement, renderOpts: ColumnEditRenderOptions, params: ColumnEditRenderParams) {
      const { options = [], optionGroups, optionProps = {}, optionGroupProps = {} } = renderOpts
      const { row, column } = params
      const { attrs } = renderOpts
      const cellValue = XEUtils.get(row, column.property)
      const props = getCellEditFilterProps(renderOpts, params, cellValue)
      const on = getEditOns(renderOpts, params)
      const nativeOn = getNativeOns(renderOpts, params)
      if (optionGroups) {
        const groupOptions = optionGroupProps.options || 'options'
        const groupLabel = optionGroupProps.label || 'label'
        return [
          h('Select', {
            attrs,
            props,
            on,
            nativeOn
          }, XEUtils.map(optionGroups, (group, gIndex) => {
            return h('OptionGroup', {
              props: {
                label: group[groupLabel]
              },
              key: gIndex
            }, renderOptions(h, group[groupOptions], optionProps))
          }))
        ]
      }
      return [
        h('Select', {
          attrs,
          props,
          on,
          nativeOn
        }, renderOptions(h, options, optionProps))
      ]
    },
    renderCell (h: CreateElement, renderOpts: ColumnCellRenderOptions, params: ColumnCellRenderParams) {
      return cellText(h, getSelectCellValue(renderOpts, params))
    },
    renderFilter (h: CreateElement, renderOpts: ColumnFilterRenderOptions, params: ColumnFilterRenderParams) {
      const { options = [], optionGroups, optionProps = {}, optionGroupProps = {} } = renderOpts
      const groupOptions = optionGroupProps.options || 'options'
      const groupLabel = optionGroupProps.label || 'label'
      const { column } = params
      const { attrs } = renderOpts
      const nativeOn = getNativeOns(renderOpts, params)
      return [
        h('div', {
          class: 'vxe-table--filter-iview-wrapper'
        }, optionGroups
          ? column.filters.map((option, oIndex) => {
            const optionValue = option.data
            const props = getCellEditFilterProps(renderOpts, params, optionValue)
            return h('Select', {
              key: oIndex,
              attrs,
              props,
              on: getFilterOns(renderOpts, params, option, () => {
                // 处理 change 事件相关逻辑
                handleConfirmFilter(params, props.multiple ? (option.data && option.data.length > 0) : !XEUtils.eqNull(option.data), option)
              }),
              nativeOn
            }, XEUtils.map(optionGroups, (group, gIndex) => {
              return h('OptionGroup', {
                key: gIndex,
                props: {
                  label: group[groupLabel]
                }
              }, renderOptions(h, group[groupOptions], optionProps))
            }))
          })
          : column.filters.map((option, oIndex) => {
            const optionValue = option.data
            const props = getCellEditFilterProps(renderOpts, params, optionValue)
            return h('Select', {
              key: oIndex,
              attrs,
              props,
              on: getFilterOns(renderOpts, params, option, () => {
                // 处理 change 事件相关逻辑
                handleConfirmFilter(params, props.multiple ? (option.data && option.data.length > 0) : !XEUtils.eqNull(option.data), option)
              }),
              nativeOn
            }, renderOptions(h, options, optionProps))
          })
        )
      ]
    },
    filterMethod (params: ColumnFilterMethodParams) {
      const { option, row, column } = params
      const { data } = option
      const { property, filterRender: renderOpts } = column
      const { props = {} } = renderOpts
      const cellValue = XEUtils.get(row, property)
      if (props.multiple) {
        if (XEUtils.isArray(cellValue)) {
          return XEUtils.includeArrays(cellValue, data)
        }
        return data.indexOf(cellValue) > -1
      }
      /* eslint-disable eqeqeq */
      return cellValue == data
    },
    renderItem (h: CreateElement, renderOpts: FormItemRenderOptions, params: FormItemRenderParams) {
      const { options = [], optionGroups, optionProps = {}, optionGroupProps = {} } = renderOpts
      const { data, property } = params
      const { attrs } = renderOpts
      const itemValue = XEUtils.get(data, property)
      const props = getItemProps(renderOpts, params, itemValue)
      const on = getItemOns(renderOpts, params)
      const nativeOn = getNativeOns(renderOpts, params)
      if (optionGroups) {
        const groupOptions = optionGroupProps.options || 'options'
        const groupLabel = optionGroupProps.label || 'label'
        return [
          h('Select', {
            props,
            attrs,
            on,
            nativeOn
          }, XEUtils.map(optionGroups, (group, gIndex) => {
            return h('OptionGroup', {
              key: gIndex,
              props: {
                label: group[groupLabel]
              }
            }, renderOptions(h, group[groupOptions], optionProps))
          }))
        ]
      }
      return [
        h('Select', {
          props,
          attrs,
          on,
          nativeOn
        }, renderOptions(h, options, optionProps))
      ]
    },
    renderItemContent (h: CreateElement, renderOpts: FormItemRenderOptions, params: FormItemRenderParams) {
      const { options = [], optionGroups, optionProps = {}, optionGroupProps = {} } = renderOpts
      const { data, property } = params
      const { attrs } = renderOpts
      const itemValue = XEUtils.get(data, property)
      const props = getItemProps(renderOpts, params, itemValue)
      const on = getItemOns(renderOpts, params)
      const nativeOn = getNativeOns(renderOpts, params)
      if (optionGroups) {
        const groupOptions = optionGroupProps.options || 'options'
        const groupLabel = optionGroupProps.label || 'label'
        return [
          h('Select', {
            props,
            attrs,
            on,
            nativeOn
          }, XEUtils.map(optionGroups, (group, gIndex) => {
            return h('OptionGroup', {
              key: gIndex,
              props: {
                label: group[groupLabel]
              }
            }, renderOptions(h, group[groupOptions], optionProps))
          }))
        ]
      }
      return [
        h('Select', {
          props,
          attrs,
          on,
          nativeOn
        }, renderOptions(h, options, optionProps))
      ]
    },
    cellExportMethod: createExportMethod(getSelectCellValue)
  },
  Cascader: {
    renderEdit: createEditRender({ transfer: true }),
    renderCell (h: CreateElement, renderOpts: ColumnCellRenderOptions, params: ColumnEditRenderParams) {
      return cellText(h, getCascaderCellValue(renderOpts, params))
    },
    renderItem: createFormItemRender(),
    renderItemContent: createFormItemRender(),
    cellExportMethod: createExportMethod(getCascaderCellValue)
  },
  DatePicker: {
    renderEdit: createEditRender({ transfer: true }),
    renderCell (h: CreateElement, renderOpts: ColumnCellRenderOptions, params: ColumnEditRenderParams) {
      return cellText(h, getDatePickerCellValue(renderOpts, params))
    },
    renderFilter (h: CreateElement, renderOpts: ColumnFilterRenderOptions, params: ColumnFilterRenderParams) {
      const { column } = params
      const { attrs } = renderOpts
      const nativeOn = getNativeOns(renderOpts, params)
      return [
        h('div', {
          class: 'vxe-table--filter-iview-wrapper'
        }, column.filters.map((option, oIndex) => {
          const optionValue = option.data
          return h(renderOpts.name, {
            key: oIndex,
            attrs,
            props: getCellEditFilterProps(renderOpts, params, optionValue),
            on: getFilterOns(renderOpts, params, option, () => {
              // 处理 change 事件相关逻辑
              handleConfirmFilter(params, !!option.data, option)
            }),
            nativeOn
          })
        }))
      ]
    },
    filterMethod (params: ColumnFilterMethodParams) {
      const { option, row, column } = params
      const { data } = option
      const { filterRender: renderOpts } = column
      const { props = {} } = renderOpts
      const cellValue = XEUtils.get(row, column.property)
      if (data) {
        switch (props.type) {
          case 'daterange':
            return equalDaterange(cellValue, data, props, 'yyyy-MM-dd')
          case 'datetimerange':
            return equalDaterange(cellValue, data, props, 'yyyy-MM-dd HH:ss:mm')
          default:
            return cellValue === data
        }
      }
      return false
    },
    renderItem: createFormItemRender(),
    renderItemContent: createFormItemRender(),
    cellExportMethod: createExportMethod(getDatePickerCellValue)
  },
  TimePicker: {
    renderEdit: createEditRender({ transfer: true }),
    renderItem: createFormItemRender(),
    renderItemContent: createFormItemRender()
  },
  Rate: {
    renderDefault: createEditRender(),
    renderEdit: createEditRender(),
    renderFilter: createFilterRender(),
    filterMethod: defaultFilterMethod,
    renderItem: createFormItemRender(),
    renderItemContent: createFormItemRender()
  },
  iSwitch: {
    renderDefault: createEditRender(),
    renderEdit: createEditRender(),
    renderFilter (h: CreateElement, renderOpts: ColumnFilterRenderOptions, params: ColumnFilterRenderParams) {
      const { column } = params
      const { name, attrs } = renderOpts
      const nativeOn = getNativeOns(renderOpts, params)
      return [
        h('div', {
          class: 'vxe-table--filter-iview-wrapper'
        }, column.filters.map((option, oIndex) => {
          const optionValue = option.data
          return h(name, {
            key: oIndex,
            attrs,
            props: getCellEditFilterProps(renderOpts, params, optionValue),
            on: getFilterOns(renderOpts, params, option, () => {
              // 处理 change 事件相关逻辑
              handleConfirmFilter(params, XEUtils.isBoolean(option.data), option)
            }),
            nativeOn
          })
        }))
      ]
    },
    filterMethod: defaultFilterMethod,
    renderItem: createFormItemRender(),
    renderItemContent: createFormItemRender()
  },
  Radio: {
    renderItem: createFormItemRadioAndCheckboxRender(),
    renderItemContent: createFormItemRadioAndCheckboxRender()
  },
  Checkbox: {
    renderItem: createFormItemRadioAndCheckboxRender(),
    renderItemContent: createFormItemRadioAndCheckboxRender()
  },
  Button: {
    renderEdit: defaultButtonEditRender,
    renderDefault: defaultButtonEditRender,
    renderItem: defaultButtonItemRender,
    renderItemContent: defaultButtonItemRender
  },
  Buttons: {
    renderEdit: defaultButtonsEditRender,
    renderDefault: defaultButtonsEditRender,
    renderItem: defaultButtonsItemRender,
    renderItemContent: defaultButtonsItemRender
  }
}

/**
 * 检查触发源是否属于目标节点
 */
function getEventTargetNode (evnt: any, container: HTMLElement, className: string) {
  let targetElem
  let target = evnt.target
  while (target && target.nodeType && target !== document) {
    if (className && target.className && target.className.split && target.className.split(' ').indexOf(className) > -1) {
      targetElem = target
    } else if (target === container) {
      return { flag: className ? !!targetElem : true, container, targetElem: targetElem }
    }
    target = target.parentNode
  }
  return { flag: false }
}

/**
 * 事件兼容性处理
 */
function handleClearEvent (params: InterceptorParams, e: any) {
  const bodyElem: HTMLElement = document.body
  const evnt = params.$event || e
  if (
    // 下拉框、日期
    getEventTargetNode(evnt, bodyElem, 'ivu-select-dropdown').flag
  ) {
    return false
  }
}

/**
 * 基于 vxe-table 表格的适配插件，用于兼容 iview 组件库
 */
export const VXETablePluginIView = {
  install ({ interceptor, renderer }: typeof VXETable) {
    renderer.mixin(renderMap)
    interceptor.add('event.clearFilter', handleClearEvent)
    interceptor.add('event.clearActived', handleClearEvent)
    interceptor.add('event.clearAreas', handleClearEvent)
  }
}

if (typeof window !== 'undefined' && window.VXETable && window.VXETable.use) {
  window.VXETable.use(VXETablePluginIView)
}

export default VXETablePluginIView
