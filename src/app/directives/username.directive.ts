import { Directive } from '@angular/core';
import { NG_VALIDATORS, AbstractControl, Validator, ValidationErrors } from '@angular/forms';
import { AppService } from '@app/service/app';

@Directive({
  selector: '[username]',
  providers: [
    { provide: NG_VALIDATORS, useExisting: UsernameValidatorDirective, multi: true }
  ]
})
export class UsernameValidatorDirective implements Validator {

  constructor(
    private app: AppService
  ) { }

  public validate(control: AbstractControl): ValidationErrors {

    return control.value === this.app.username ? null : { username: false };

  }

}
