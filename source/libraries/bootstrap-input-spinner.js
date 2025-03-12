/**
 * MIT License
 *
 * Copyright (c) Stefan Haack <https://shaack.com> and Justin Kunimnue
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * This file is based on the handy script published at
 * <https://github.com/shaack/bootstrap-input-spinner>,
 * modified by Justin to not require jQuery and remove the hidden "original" element.
 */

"use strict"

var triggerKeyPressed = false

function activateInputSpinner(inputGroup, options) {

    var config = {
        autoDelay: 500, // ms holding before auto value change
        autoInterval: 100, // speed of auto value change
        boostThreshold: 10, // boost after these steps
        boostMultiplier: "auto" // you can also set a constant number as multiplier
    }
    for (var option in options) {
        config[option] = options[option]
    }

    var locale = navigator.language || "en-US"

    var autoDelayHandler = null
    var autoIntervalHandler = null
    var autoMultiplier = config.boostMultiplier === "auto"
    var boostMultiplier = autoMultiplier ? 1 : config.boostMultiplier

    var buttonDecrement = inputGroup.querySelector(".btn-decrement")
    var buttonIncrement = inputGroup.querySelector(".btn-increment")
    var input = inputGroup.querySelector("input")

    var min = null
    var max = null
    var step = null
    var stepMax = null
    var decimals = null
    var numberFormat = null

    // collect the attributes from the input element
    updateAttributes()

    var value = parseFloat(input.getAttribute("value"))
    var boostStepsCount = 0

    // add a listener so that the attributes get updated on mutation
    var observer = new MutationObserver(function () {
        updateAttributes()
        setValue(value)
    })
    observer.observe(input, {attributes: true})

    setValue(value)

    // add listeners so that the value gets reformatted every time the user defocuses it
    input.addEventListener("change", function (event) {
        setValue(input.value)
    })

    // link the side buttons to the main input
    onPointerDown(buttonDecrement, function () {
        stepHandling(-step)
    })
    onPointerDown(buttonIncrement, function () {
        stepHandling(step)
    })
    onPointerUp(document.body, function () {
        resetTimer()
    })

    function setValue(newValue) {
        if (isNaN(newValue) || newValue === "") {
            newValue = min
        }
        newValue = parseFloat(newValue)
        newValue = Math.min(Math.max(newValue, min), max)
        newValue = Math.round(newValue * Math.pow(10, decimals)) / Math.pow(10, decimals)
        input.value = numberFormat.format(newValue)
        value = newValue
    }

    function dispatchEvent(element, type) {
        if (type) {
            setTimeout(function () {
                var event
                if (typeof (Event) === 'function') {
                    event = new Event(type, {bubbles: true})
                } else { // IE
                    event = document.createEvent('Event')
                    event.initEvent(type, true, true)
                }
                element.dispatchEvent(event)
            })
        }
    }

    function stepHandling(step) {
        if (!input.disabled && !input.readOnly) {
            calcStep(step)
            resetTimer()
            autoDelayHandler = setTimeout(function () {
                autoIntervalHandler = setInterval(function () {
                    if (boostStepsCount > config.boostThreshold) {
                        if (autoMultiplier) {
                            calcStep(step * parseInt(boostMultiplier, 10))
                            if (boostMultiplier < 100000000) {
                                boostMultiplier = boostMultiplier * 1.1
                            }
                            if (stepMax) {
                                boostMultiplier = Math.min(stepMax, boostMultiplier)
                            }
                        } else {
                            calcStep(step * boostMultiplier)
                        }
                    } else {
                        calcStep(step)
                    }
                    boostStepsCount++
                }, config.autoInterval)
            }, config.autoDelay)
        }
    }

    function calcStep(step) {
        if (isNaN(value)) {
            value = 0
        }
        setValue(Math.round(value / step) * step + step)
        dispatchEvent(input, "input")
        dispatchEvent(input, "change")
    }

    function resetTimer() {
        boostStepsCount = 0
        boostMultiplier = boostMultiplier = autoMultiplier ? 1 : config.boostMultiplier
        clearTimeout(autoDelayHandler)
        clearTimeout(autoIntervalHandler)
    }

    function updateAttributes() {
        // propagate disability to the increment and decrement buttons
        var disabled = input.hasAttribute("disabled")
        var readonly = input.hasAttribute("readonly")
        buttonIncrement.toggleAttribute("disabled", disabled || readonly)
        buttonDecrement.toggleAttribute("disabled", disabled || readonly)
        if (disabled || readonly) {
            resetTimer()
        }

        // update the main attributes
        min = parseFloat(input.getAttribute("min")) || 0
        max = parseFloat(input.getAttribute("max"))
        step = parseFloat(input.getAttribute("step")) || 1
        stepMax = parseInt(input.getAttribute("data-step-max")) || 0
        var newDecimals = parseInt(input.getAttribute("data-decimals")) || 0
        if (decimals !== newDecimals) {
            decimals = newDecimals
            numberFormat = new Intl.NumberFormat(locale, {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
                useGrouping: false // type="number" unfortunately doesn't work with digit grouping
            })
        }
    }
}

function onPointerUp(element, callback) {
    element.addEventListener("mouseup", function (e) {
        callback(e)
    })
    element.addEventListener("touchend", function (e) {
        callback(e)
    })
    element.addEventListener("keyup", function (e) {
        if ((e.keyCode === 32 || e.keyCode === 13)) {
            triggerKeyPressed = false
            callback(e)
        }
    })
}

function onPointerDown(element, callback) {
    element.addEventListener("mousedown", function (e) {
        e.preventDefault()
        callback(e)
    })
    element.addEventListener("touchstart", function (e) {
        if (e.cancelable) {
            e.preventDefault()
        }
        callback(e)
    })
    element.addEventListener("keydown", function (e) {
        if ((e.keyCode === 32 || e.keyCode === 13) && !triggerKeyPressed) {
            triggerKeyPressed = true
            callback(e)
        }
    })
}
