import { Directive } from '@angular/core';
import { NG_VALIDATORS, AbstractControl, Validator, ValidationErrors } from '@angular/forms';

@Directive({
  selector: '[port]',
  providers: [
    { provide: NG_VALIDATORS, useExisting: PortValidatorDirective, multi: true }
  ]
})
export class PortValidatorDirective implements Validator {

  constructor() { }

  public validate(control: AbstractControl): ValidationErrors {

    if ( ! control.value ) return null;

    return typeof control.value === 'number' && control.value >= 0 && control.value <= 65535 ? null : { port: false };

  }

}
