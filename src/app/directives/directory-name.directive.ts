import { Directive } from '@angular/core';
import { NG_VALIDATORS, AbstractControl, Validator, ValidationErrors } from '@angular/forms';

@Directive({
  selector: '[directoryName]',
  providers: [
    { provide: NG_VALIDATORS, useExisting: DirectoryNameValidatorDirective, multi: true }
  ]
})
export class DirectoryNameValidatorDirective implements Validator {

  constructor() { }

  public validate(control: AbstractControl): ValidationErrors {

    const error = { directoryName: false };

    if ( ! control.value || ! control.value.trim() ) return error;

    if ( control.value.trim().match(/\/|\\/g) ) return error;
    if ( control.value.trim().match(/^[\.\s]+$/) ) return error;

    return null;

  }

}
